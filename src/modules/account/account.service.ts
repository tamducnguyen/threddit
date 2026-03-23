import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AccountRepository } from './account.repository';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { UpdatePasswordDTO } from './dtos/updatepassword.dto';
import { AuthUser } from '../token/authuser.interface';
import { HashHelper } from '../common/helper/hash.helper';
import { UpdateUsernameDTO } from './dtos/updateusername.dto';
import { AuthMethod } from '../enum/authmethod.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { prefixCache, ttlCache } from '../config/cache.config';
import { generateVerificationCode } from '../common/helper/gencode.helper';
import { MailService } from '../mail/mail.service';
import { DeleteAccountDTO } from './dtos/deleteaccount.dto';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class AccountService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly mailService: MailService,
    private readonly accountRepository: AccountRepository,
  ) {}
  async signOut(accessToken: string) {
    await this.accountRepository.revokeSessionByToken(accessToken);
    return sendResponse(HttpStatus.OK, message.account.signout.success);
  }
  async updatePassword(
    currentuser: AuthUser,
    updatePasswordDTO: UpdatePasswordDTO,
  ) {
    const { oldPassword, newPassword, confirmedNewPassword } =
      updatePasswordDTO;
    const { sub } = currentuser;
    //check auth method
    const userFound = await this.accountRepository.findUser(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_password.user_not_found,
          undefined,
          errorCode.account.update_password.user_not_found,
        ),
      );
    }
    if (userFound.authMethod != AuthMethod.CREDENTIAL) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_password.not_support_this_auth_method,
          undefined,
          errorCode.account.update_password.not_support_this_auth_method,
        ),
      );
    }
    //compare old password and new password
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_password.passport_same,
          undefined,
          errorCode.account.update_password.passport_same,
        ),
      );
    }
    //compare new password and confirmed one
    if (newPassword !== confirmedNewPassword) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_password.password_mismatch,
          undefined,
          errorCode.account.update_password.password_mismatch,
        ),
      );
    }
    //compare old password with stored one
    const isCorrectPassword = await HashHelper.compare(
      oldPassword,
      userFound.authMethodKey,
    );
    if (!isCorrectPassword) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_password.password_incorrect,
          undefined,
          errorCode.account.update_password.password_incorrect,
        ),
      );
    }
    //change password and revoke all session
    const newPasswordHashed = await HashHelper.hash(newPassword);
    await this.accountRepository.updatePasswordAndRevokeAllToken(
      userFound.id,
      newPasswordHashed,
    );
    return sendResponse(HttpStatus.OK, message.account.update_password.success);
  }
  async updateUsername(
    currentUser: AuthUser,
    updateUsernameDTO: UpdateUsernameDTO,
  ) {
    const { username } = updateUsernameDTO;
    const { sub } = currentUser;
    //check if username duplicated
    const userFound = await this.accountRepository.findUser(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_username.user_not_found,
          undefined,
          errorCode.account.update_username.user_not_found,
        ),
      );
    }
    if (username == userFound.username) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.update_username.username_duplicate,
          undefined,
          errorCode.account.update_username.username_duplicate,
        ),
      );
    }
    //update username
    try {
      await this.accountRepository.updateUsernameAndRevokeAllSession(
        sub,
        username,
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } })?.driverError?.code ===
          '23505'
      ) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.account.update_username.username_exist,
            undefined,
            errorCode.account.update_username.username_exist,
          ),
        );
      }
      throw error;
    }
    return sendResponse(HttpStatus.OK, message.account.update_username.success);
  }
  /**
   * get user information
   */
  async getUserInfo(currentUser: AuthUser) {
    const { sub } = currentUser;
    const userFound = await this.accountRepository.findUser(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.get_user_info.user_not_found,
          undefined,
          errorCode.account.get_user_info.user_not_found,
        ),
      );
    }
    const accountinfo = {
      email: userFound.email,
      username: userFound.username,
      authMethod: userFound.authMethod,
    };
    return sendResponse(
      HttpStatus.OK,
      message.account.get_user_info.success,
      accountinfo,
    );
  }
  async requestDeleteAccount(currentUser: AuthUser) {
    const { sub } = currentUser;
    // Ensure user exists before sending delete verification.
    const userFound = await this.accountRepository.findUser(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.user_not_found,
          undefined,
          errorCode.account.delete_account.user_not_found,
        ),
      );
    }
    // Rate limit attemp verification by email.
    const keyAttempts = prefixCache.deleteaccount_attemps + userFound.email;
    const attempts = (await this.cacheManager.get<number>(keyAttempts)) || 0;
    if (attempts >= 5) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.too_many_attempts,
          undefined,
          errorCode.account.delete_account.too_many_attempts,
        ),
      );
    }
    // Throttle repeated mail sends.
    const keyAlreadyMail = prefixCache.deleteaccount_mail + userFound.email;
    const isAlreadySendMail =
      await this.cacheManager.get<boolean>(keyAlreadyMail);
    if (isAlreadySendMail) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.mail_throttled,
          undefined,
          errorCode.account.delete_account.mail_throttled,
        ),
      );
    }
    // Replace any previous code with a fresh one.
    const keyVerificationCode =
      prefixCache.deleteaccount_code + userFound.email;
    await this.cacheManager.del(keyVerificationCode);
    const verificationCode = generateVerificationCode();
    // Send verification email; abort on failure.
    const isSent = await this.mailService.sendDeleteAccount(
      userFound.email,
      verificationCode,
    );
    if (!isSent) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.mail_failed,
          undefined,
          errorCode.account.delete_account.mail_failed,
        ),
      );
    }
    // Cache throttle + code with TTL.
    await this.cacheManager.set(keyAlreadyMail, true, ttlCache.mail);
    await this.cacheManager.set(
      keyVerificationCode,
      verificationCode,
      ttlCache.code,
    );
    return sendResponse(
      HttpStatus.OK,
      message.account.delete_account.mail_sent,
    );
  }
  async verifyDeleteAccount(
    currentUser: AuthUser,
    deleteAccountDTO: DeleteAccountDTO,
  ) {
    const { sub } = currentUser;
    const { verificationCode } = deleteAccountDTO;
    // Ensure user exists before processing verification.
    const userFound = await this.accountRepository.findUser(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.user_not_found,
          undefined,
          errorCode.account.delete_account.user_not_found,
        ),
      );
    }
    // Rate limit verification attempts.
    const keyAttempts = prefixCache.deleteaccount_attemps + userFound.email;
    let attempts = (await this.cacheManager.get<number>(keyAttempts)) || 0;
    if (attempts >= 5) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.too_many_attempts,
          undefined,
          errorCode.account.delete_account.too_many_attempts,
        ),
      );
    }
    // Validate cached verification code.
    const keyVerificationCode =
      prefixCache.deleteaccount_code + userFound.email;
    const verificationCodeCached =
      await this.cacheManager.get<string>(keyVerificationCode);
    if (!verificationCodeCached) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.invalid_or_expired_code,
          undefined,
          errorCode.account.delete_account.invalid_or_expired_code,
        ),
      );
    }
    if (String(verificationCode) !== String(verificationCodeCached)) {
      // Count bad attempts to slow brute force.
      await this.cacheManager.set(keyAttempts, ++attempts, ttlCache.attemps);
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.account.delete_account.invalid_or_expired_code,
          undefined,
          errorCode.account.delete_account.invalid_or_expired_code,
        ),
      );
    }
    // Delete user and sessions after successful verification.
    await this.accountRepository.deleteUserAndSessions(userFound.id);
    // Clean up related cache keys.
    await this.cacheManager.del(keyAttempts);
    await this.cacheManager.del(keyVerificationCode);
    await this.cacheManager.del(
      prefixCache.deleteaccount_mail + userFound.email,
    );
    return sendResponse(HttpStatus.OK, message.account.delete_account.success);
  }
}
