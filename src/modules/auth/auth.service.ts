import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SignUpDTO } from './dtos/signup.dto';
import { AuthRepository } from './auth.repository';
import { HashHelper } from '../common/helper/hash.helper';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { prefixCache, ttlCache } from 'src/modules/config/cache.config';
import { MailService } from 'src/modules/mail/mail.service';
import { generateVerificationCode } from '../common/helper/gencode.helper';
import { sendResponse } from '../common/helper/response.helper';
import { VerifyAccountDTO } from './dtos/verifyaccount.dto';
import { UserEntity } from '../entities/user.entity';
import { CredentialEntity } from '../entities/credential.entity';
import { SignUpInfoCache } from './interfaces/signupinfocache.interface';
import { message } from '../common/helper/message.helper';
import { SignInDTO } from './dtos/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { sendCookie } from '../common/helper/cookie.helper';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDTO } from './dtos/resetpassword.dto';
import { VerifyResetPasswordDTO } from './dtos/verifyresetpassword.dto';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly mailService: MailService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async signUp(signUpDTO: SignUpDTO) {
    const { email, username, password, confirmedPassword } = signUpDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    const attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new BadRequestException(message.auth.verify.too_many_attempts);
    }
    //check if already send verification via mail
    const isAlreadySendMail = await this.cacheManager.get<boolean>(
      prefixCache.alreadymail + email,
    );
    if (isAlreadySendMail) {
      throw new BadRequestException(message.auth.signup.mail_throttled);
    }
    const keyVerificationCode = prefixCache.verification + email;
    await this.cacheManager.del(keyVerificationCode);
    //check if password and confirmed one match
    if (password !== confirmedPassword) {
      throw new BadRequestException(message.auth.signup.password_mismatch);
    }
    //check exist email, username
    const isEmailExist = await this.authRepository.checkEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException(message.auth.signup.email_exists);
    }
    const isUsernameExist =
      await this.authRepository.checkUsernameExist(username);
    if (isUsernameExist) {
      throw new BadRequestException(message.auth.signup.username_exists);
    }
    //hash and cache sign up information
    const hashedPassword = await HashHelper.hash(password);
    const signUpInfor: SignUpInfoCache = {
      email: email,
      username: username,
      hashedPassword: hashedPassword,
    };
    const keySignUp = prefixCache.inforsignup + email;
    await this.cacheManager.set(keySignUp, signUpInfor, ttlCache.info);
    //generate and send verification code via mail, cache to avoid brute force
    const verificationCode = generateVerificationCode();
    const isSent = await this.mailService.sendVerifyCode(
      email,
      verificationCode,
    );
    if (!isSent) {
      throw new BadRequestException(message.auth.signup.mail_failed);
    }
    const keyAlreadyMail = prefixCache.alreadymail + email;
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    //cache verification code
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    return sendResponse(HttpStatus.OK, message.auth.signup.success);
  }
  async verifyAccount(verifyAccountDTO: VerifyAccountDTO) {
    const { email, verificationCode } = verifyAccountDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    let attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new BadRequestException(message.auth.verify.too_many_attempts);
    }
    //check if email exist in db
    const isEmailExist = await this.authRepository.checkEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException(message.auth.verify.already_verified);
    }
    //check if email exist in cache-memory
    const keyVerificationCode = prefixCache.verification + email;
    const verificationCodeCached =
      await this.cacheManager.get<string>(keyVerificationCode);
    if (!verificationCodeCached) {
      throw new BadRequestException(
        message.auth.verify.invalid_or_expired_code,
      );
    }
    //compare verification code
    if (String(verificationCode) !== String(verificationCodeCached)) {
      await this.cacheManager.set(keyAttemps, ++attemps, ttlCache.attemps);
      throw new BadRequestException(
        message.auth.verify.invalid_or_expired_code,
      );
    }
    //store user's information
    const keySignUp = prefixCache.inforsignup + email;
    const signUpInfor = await this.cacheManager.get<SignUpInfoCache>(keySignUp);
    if (!signUpInfor) {
      throw new BadRequestException(
        message.auth.verify.invalid_or_expired_code,
      );
    }
    const userEntity: Partial<UserEntity> = {
      email: signUpInfor.email,
      username: signUpInfor.username,
    };
    const credentialEntity: Partial<CredentialEntity> = {
      hashedPassword: signUpInfor.hashedPassword,
    };
    //del cache
    await this.authRepository.saveUserCredential(userEntity, credentialEntity);
    await this.cacheManager.del(prefixCache.alreadymail + email);
    await this.cacheManager.del(prefixCache.inforsignup + email);
    await this.cacheManager.del(prefixCache.attemps + email);
    await this.cacheManager.del(prefixCache.verification + email);
    return sendResponse(HttpStatus.OK, message.auth.verify.success);
  }
  /**
   * sign in
   *
   */
  async signIn(res: Response, signInDTO: SignInDTO) {
    const { email, password } = signInDTO;
    //check if email exist
    const userFound = await this.authRepository.findUserViaEmail(email);
    if (!userFound || !userFound.credential) {
      throw new BadRequestException(message.auth.signin.credential_incorrect);
    }
    //check if password correct
    const isMatchPassword = await HashHelper.compare(
      password,
      userFound.credential.hashedPassword,
    );
    if (!isMatchPassword) {
      throw new BadRequestException(message.auth.signin.credential_incorrect);
    }
    //save token into db
    const payload = { sub: userFound.id, email: userFound.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const sessionEntity: Partial<SessionEntity> = {
      user: userFound,
      token: accessToken,
    };
    await this.authRepository.saveSession(sessionEntity);
    //send token
    sendCookie(res, this.configService, 'accessToken', accessToken);
    return sendResponse(HttpStatus.OK, message.auth.signin.success, {
      accessToken,
    });
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
      throw new BadRequestException(
        message.auth.verify_reset_password.too_many_attempts,
      );
    }
    //check if already sent mail
    const keyAlreadyMail = prefixCache.alreadymail + email;
    const isAlreadySendMail =
      await this.cacheManager.get<boolean>(keyAlreadyMail);
    if (isAlreadySendMail) {
      throw new BadRequestException(message.auth.reset_password.mail_throttled);
    }
    //check if email exists
    const userFound = await this.authRepository.findUserViaEmail(email);
    if (!userFound || !userFound.credential) {
      throw new BadRequestException(
        message.auth.reset_password.email_not_exists,
      );
    }
    //delete previous verfication code if have
    const keyVerificationCode = prefixCache.verification + email;
    await this.cacheManager.del(keyVerificationCode);
    //generate verification code and send it via email
    const verificationCode = generateVerificationCode();
    const isEmailSent = await this.mailService.sendForgotPassword(
      email,
      verificationCode,
    );
    if (!isEmailSent) {
      throw new BadRequestException(message.auth.reset_password.mail_failed);
    }
    //cache mail and verification code
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    return sendResponse(HttpStatus.OK, message.auth.reset_password.success);
  }
  /**
   * verify reset password
   */
  async verifyResetPassword(verifyResetPasswordDTO: VerifyResetPasswordDTO) {
    const { email, verificationCode, newPassword, confirmedNewPassword } =
      verifyResetPasswordDTO;
    //get attemp number and check if user got banned
    const keyAttemps = prefixCache.attemps + email;
    let attemps = (await this.cacheManager.get<number>(keyAttemps)) || 0;
    if (attemps >= 5) {
      throw new BadRequestException(
        message.auth.verify_reset_password.too_many_attempts,
      );
    }
    //check if password is match
    if (newPassword !== confirmedNewPassword) {
      throw new BadRequestException(
        message.auth.verify_reset_password.password_mismatch,
      );
    }
    //check if email exists
    const userFound = await this.authRepository.findUserViaEmail(email);
    if (!userFound || !userFound.credential) {
      throw new BadRequestException(
        message.auth.verify_reset_password.email_not_exists,
      );
    }
    //check if verification code in cache memory and compare verification code
    const keyVerificationCode = prefixCache.verification + email;
    const verificationCodeCached =
      await this.cacheManager.get<string>(keyVerificationCode);
    if (!verificationCodeCached) {
      throw new BadRequestException(
        message.auth.verify_reset_password.invalid_or_expired_code,
      );
    }
    if (String(verificationCode) !== String(verificationCodeCached)) {
      await this.cacheManager.set(keyAttemps, ++attemps, ttlCache.attemps);
      throw new BadRequestException(
        message.auth.verify_reset_password.invalid_or_expired_code,
      );
    }
    //update password
    const hashedPassword = await HashHelper.hash(newPassword);
    await this.authRepository.updatePasswordAndRevokeAllToken(
      userFound.credential.id,
      hashedPassword,
      userFound,
    );
    //delete cache
    await this.cacheManager.del(keyAttemps);
    await this.cacheManager.del(keyVerificationCode);
    return sendResponse(
      HttpStatus.OK,
      message.auth.verify_reset_password.success,
    );
  }
}
