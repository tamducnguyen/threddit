import { Inject, Injectable } from '@nestjs/common';
import {
  AuthResendVerificationCodeAlreadyVerifiedException,
  AuthResendVerificationCodeEmailNotExistsException,
  AuthResendVerificationCodeMailThrottledException,
  AuthResendVerificationCodeTooManyAttemptsException,
  AuthResetPasswordMailThrottledException,
  AuthResetPasswordTooManyAttemptsException,
  AuthSigninAccountNotActivateException,
  AuthSigninCredentialIncorrectException,
  AuthSignupEmailExistsException,
  AuthSignupMailThrottledException,
  AuthSignupTooManyAttemptsException,
  AuthSignupUsernameExistsException,
  AuthVerifyAlreadyVerifiedException,
  AuthVerifyInvalidOrExpiredCodeException,
  AuthVerifyResetPasswordEmailNotExistsException,
  AuthVerifyResetPasswordInvalidOrExpiredCodeException,
  AuthVerifyResetPasswordTooManyAttemptsException,
  AuthVerifyTooManyAttemptsException,
} from '../../common/exception';
import { SignUpDTO } from './dtos/signup.dto';
import { AuthRepository } from './auth.repository';
import { HashHelper } from '../../common/helper/hash.helper';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { prefixCache, ttlCache } from 'src/config/cache.config';
import {
  JobMailQueue,
  NameMailQueue,
} from 'src/modules/mail/helper/mail.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { generateVerificationCode } from '../../common/helper/gencode.helper';
import { VerifyAccountDTO } from './dtos/verifyaccount.dto';
import { UserEntity } from '../../entities/user.entity';
import { SignInDTO } from './dtos/signin.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDTO } from './dtos/resetpassword.dto';
import { VerifyResetPasswordDTO } from './dtos/verifyresetpassword.dto';
import { SessionService } from '../token/session.service';
import { AuthMethod } from '../../enum/authmethod.enum';
import { QueryFailedError } from 'typeorm';
import { ResendVerifyDTO } from './dtos/resendverify.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue(NameMailQueue) private readonly mailQueue: Queue,
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}
  async signUp(signUpDTO: SignUpDTO) {
    const { email, username, displayName, password } = signUpDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    const attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new AuthSignupTooManyAttemptsException();
    }
    //check if already send verification via mail
    const isAlreadySendMail = await this.cacheManager.get<boolean>(
      prefixCache.alreadymail + email,
    );
    if (isAlreadySendMail) {
      throw new AuthSignupMailThrottledException();
    }
    const keyVerificationCode = prefixCache.verification + email;
    await this.cacheManager.del(keyVerificationCode);
    //hash password
    const hashedPassword = await HashHelper.hash(password);
    const userEntity: Partial<UserEntity> = {
      email: email,
      username: username,
      displayName: displayName,
      authMethod: AuthMethod.CREDENTIAL,
      authMethodKey: hashedPassword,
      isActivate: false,
    };
    try {
      await this.authRepository.createUser(userEntity);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } })?.driverError?.code ===
          '23505'
      ) {
        const isEmailExistNow =
          await this.authRepository.checkEmailExist(email);
        if (isEmailExistNow) {
          throw new AuthSignupEmailExistsException();
        }
        const isUsernameExistNow =
          await this.authRepository.checkUsernameExist(username);
        if (isUsernameExistNow) {
          throw new AuthSignupUsernameExistsException();
        }
      }
      throw error;
    }
    //generate verification code, cache to avoid brute force
    const verificationCode = generateVerificationCode();
    const keyAlreadyMail = prefixCache.alreadymail + email;
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    //cache verification code
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    //enqueue verification mail so signup doesn't wait on the mail provider
    this.mailQueue
      .add(JobMailQueue.SEND_VERIFY_CODE, {
        email,
        verificationCode,
      })
      .catch((error) => {
        console.error(
          `Failed to enqueue signup verification mail for ${email}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    return { kind: 'success' };
  }
  async verifyAccount(verifyAccountDTO: VerifyAccountDTO) {
    const { email, verificationCode } = verifyAccountDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    let attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new AuthVerifyTooManyAttemptsException();
    }
    //check user exist
    const userFound = await this.authRepository.findUserCredential(email);
    if (!userFound) {
      throw new AuthVerifyInvalidOrExpiredCodeException();
    }
    //check if already activate
    if (userFound.isActivate) {
      throw new AuthVerifyAlreadyVerifiedException();
    }
    //check if email exist in cache-memory
    const keyVerificationCode = prefixCache.verification + email;
    const verificationCodeCached =
      await this.cacheManager.get<string>(keyVerificationCode);
    if (!verificationCodeCached) {
      throw new AuthVerifyInvalidOrExpiredCodeException();
    }
    //compare verification code
    if (String(verificationCode) !== String(verificationCodeCached)) {
      await this.cacheManager.set(keyAttemps, ++attemps, ttlCache.attemps);
      throw new AuthVerifyInvalidOrExpiredCodeException();
    }
    //update user activation
    await this.authRepository.updateUserActivation(userFound.id, true);
    //del cache
    await this.cacheManager.del(prefixCache.alreadymail + email);
    await this.cacheManager.del(prefixCache.attemps + email);
    await this.cacheManager.del(prefixCache.verification + email);
    return { kind: 'success' };
  }
  async resendVerify(resendVerifyDTO: ResendVerifyDTO) {
    const { email } = resendVerifyDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    const attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new AuthResendVerificationCodeTooManyAttemptsException();
    }
    //check if already send verification via mail
    const isAlreadySendMail = await this.cacheManager.get<boolean>(
      prefixCache.alreadymail + email,
    );
    if (isAlreadySendMail) {
      throw new AuthResendVerificationCodeMailThrottledException();
    }
    //check if credential exists
    const userFound = await this.authRepository.findUserCredential(email);
    if (!userFound) {
      throw new AuthResendVerificationCodeEmailNotExistsException();
    }
    //check if activate
    if (userFound.isActivate) {
      throw new AuthResendVerificationCodeAlreadyVerifiedException();
    }
    //delete key already sent mail cache if have
    const keyVerificationCode = prefixCache.verification + email;
    await this.cacheManager.del(keyVerificationCode);
    //cache key already sent mail
    const verificationCode = generateVerificationCode();
    const keyAlreadyMail = prefixCache.alreadymail + email;
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    //enqueue verification mail so resend doesn't wait on the mail provider
    this.mailQueue
      .add(JobMailQueue.SEND_VERIFY_CODE, {
        email,
        verificationCode,
      })
      .catch((error) => {
        console.error(
          `Failed to enqueue resend verification mail for ${email}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    return { kind: 'success' };
  }
  /**
   * sign in
   *
   */
  async signIn(res: Response, signInDTO: SignInDTO) {
    const { email, password } = signInDTO;
    //find user with email
    const userFound = await this.authRepository.findUserCredential(email);
    //check if credential information is correct
    if (
      !userFound ||
      userFound.authMethod !== AuthMethod.CREDENTIAL ||
      !userFound.authMethodKey
    ) {
      throw new AuthSigninCredentialIncorrectException();
    }
    //check if user account is activate
    if (userFound.isActivate == false) {
      throw new AuthSigninAccountNotActivateException();
    }
    //compare password
    const isMatchPassword = await HashHelper.compare(
      password,
      userFound.authMethodKey,
    );
    if (!isMatchPassword) {
      throw new AuthSigninCredentialIncorrectException();
    }
    //create session and cache it
    const accessToken = await this.sessionService.createSession(userFound);
    //send token
    return {
      kind: 'success',
      data: {
        userId: userFound.id,
        AUTH_METHOD: userFound.authMethod,
        THREDDIT_AUTH: accessToken,
      },
    };
  }
  /**
   * reset password
   * @param resetPassword
   * @returns
   */
  async resetPassword(resetPassword: ResetPasswordDTO) {
    const { email } = resetPassword;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    const attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new AuthResetPasswordTooManyAttemptsException();
    }
    //check if already sent mail
    const keyAlreadyMail = prefixCache.alreadymail + email;
    const isAlreadySendMail =
      await this.cacheManager.get<boolean>(keyAlreadyMail);
    if (isAlreadySendMail) {
      throw new AuthResetPasswordMailThrottledException();
    }
    //check if email exists
    const userFound = await this.authRepository.findUserCredential(email);
    if (
      !userFound ||
      userFound.authMethod !== AuthMethod.CREDENTIAL ||
      !userFound.isActivate
    ) {
      return { kind: 'success' };
    }
    //delete previous verfication code if have
    const keyVerificationCode = prefixCache.verification + email;
    await this.cacheManager.del(keyVerificationCode);
    //generate verification code and cache mail and verification code
    const verificationCode = generateVerificationCode();
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    //enqueue verification mail so reset password doesn't wait on the mail provider
    this.mailQueue
      .add(JobMailQueue.SEND_FORGOT_PASSWORD, {
        email,
        verificationCode,
      })
      .catch((error) => {
        console.error(
          `Failed to enqueue forgot password mail for ${email}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    return { kind: 'success' };
  }
  /**
   * verify reset password
   */
  async verifyResetPassword(verifyResetPasswordDTO: VerifyResetPasswordDTO) {
    const { email, verificationCode, newPassword } = verifyResetPasswordDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    let attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new AuthVerifyResetPasswordTooManyAttemptsException();
    }
    //check if email exists
    const userFound = await this.authRepository.findUserCredential(email);
    if (
      !userFound ||
      userFound.authMethod !== AuthMethod.CREDENTIAL ||
      !userFound.isActivate
    ) {
      throw new AuthVerifyResetPasswordEmailNotExistsException();
    }
    //check if verification code in cache memory and compare verification code
    const keyVerificationCode = prefixCache.verification + email;
    const verificationCodeCached =
      await this.cacheManager.get<string>(keyVerificationCode);
    if (!verificationCodeCached) {
      throw new AuthVerifyResetPasswordInvalidOrExpiredCodeException();
    }
    if (String(verificationCode) !== String(verificationCodeCached)) {
      await this.cacheManager.set(keyAttemps, ++attemps, ttlCache.attemps);
      throw new AuthVerifyResetPasswordInvalidOrExpiredCodeException();
    }
    //update password
    const hashedPassword = await HashHelper.hash(newPassword);
    const sessionTokens = await this.sessionService.getSessionTokensOfUser(
      userFound.id,
    );
    await this.authRepository.updatePasswordAndRevokeAllToken(
      userFound.id,
      hashedPassword,
    );
    //mark revoked sessions in cache after the db write
    await this.sessionService.revokeSessionCaches(sessionTokens, userFound.id);
    //delete cache
    await this.cacheManager.del(keyAttemps);
    await this.cacheManager.del(keyVerificationCode);
    return { kind: 'success' };
  }
}
