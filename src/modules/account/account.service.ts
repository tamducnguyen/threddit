import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { AccountRepository } from './account.repository';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { UpdatePasswordDTO } from './dtos/updatepassword.dto';
import { AuthUser } from '../token/authuser.interface';
import { HashHelper } from '../common/helper/hash.helper';
import { UpdateUsernameDTO } from './dtos/updateusername.dto';

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}
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
    //compare old password and new password
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        message.account.update_password.passport_same,
      );
    }
    //compare new password and confirmed one
    if (newPassword !== confirmedNewPassword) {
      throw new BadRequestException(
        message.account.update_password.password_mismatch,
      );
    }
    //compare old password with stored one
    const userFound = await this.accountRepository.selectPassword(sub);
    if (!userFound) {
      throw new BadRequestException(
        message.account.update_password.user_not_found,
      );
    }
    const isCorrectPassword = await HashHelper.compare(
      oldPassword,
      userFound.credential.hashedPassword,
    );
    if (!isCorrectPassword) {
      throw new BadRequestException(
        message.account.update_password.password_incorrect,
      );
    }
    //change password and revoke all session
    const newPasswordHashed = await HashHelper.hash(newPassword);
    await this.accountRepository.updatePasswordAndRevokeAllToken(
      userFound.credential.id,
      newPasswordHashed,
      userFound,
    );
    return sendResponse(HttpStatus.OK, message.account.update_password.success);
  }
  async updateUsername(
    currentUser: AuthUser,
    updateUsernameDTO: UpdateUsernameDTO,
  ) {
    const { username } = updateUsernameDTO;
    const { sub } = currentUser;
    //check if username exist
    const isUsernameExist =
      await this.accountRepository.checkUsernameExist(username);
    if (isUsernameExist) {
      throw new BadRequestException(
        message.account.update_username.username_exist,
      );
    }
    //update username
    await this.accountRepository.updateUsername(sub, username);
    return sendResponse(HttpStatus.OK, message.account.update_username.success);
  }
}
