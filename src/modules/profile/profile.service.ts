import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProfileRepository } from './profile.repository';
import { AuthUser } from '../token/authuser.interface';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { ConfigService } from '@nestjs/config';
import { errorCode } from '../common/helper/errorcode.helper';
import { UpdateProfileDTO } from './dtos/updateprofile.dto';
import { AvatarPresignDTO } from './dtos/avatarpresign.dto';
import { AvatarConfirmDTO } from './dtos/avatarconfirm.dto';
import { BackgroundPresignDTO } from './dtos/backgroundpresign.dto';
import { BackgroundConfirmDTO } from './dtos/backgroundconfirm.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProfileService {
  private STORAGE_URL: string;
  private avatarMaxSize: number;
  private backgroundMaxSize: number;
  constructor(
    private readonly profileRepo: ProfileRepository,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.STORAGE_URL = this.configService.getOrThrow<string>('STORAGE_URL');
    this.avatarMaxSize =
      this.configService.getOrThrow<number>('AVATAR_MAX_SIZE');
    this.backgroundMaxSize = this.configService.getOrThrow<number>(
      'BACKGROUND_MAX_SIZE',
    );
  }
  /**
   * get user profile
   * @param currentUser
   * @param usernameDTO
   * @returns
   */
  async getSelfProfile(currentUser: AuthUser) {
    //check if user exist
    const userFound = await this.profileRepo.findUserById(currentUser.sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.get_profile.user_not_found,
          undefined,
          errorCode.profile.get_profile.user_not_found,
        ),
      );
    }
    //convert relative path into url
    const avatarUrl = userFound.avatarRelativePath
      ? this.STORAGE_URL + userFound.avatarRelativePath
      : null;
    const backgroundImageUrl = userFound.backgroundImageRelativePath
      ? this.STORAGE_URL + userFound.backgroundImageRelativePath
      : null;
    //send response
    const profile = {
      email: userFound.email,
      username: userFound.username,
      displayName: userFound.displayName,
      dateOfBirth: userFound.dateOfBirth,
      gender: userFound.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return sendResponse(
      HttpStatus.OK,
      message.profile.get_profile.success,
      profile,
    );
  }
  async getOtherProfile(currentUser: AuthUser, otherUsername: string) {
    //check if user exist
    const userFound = await this.profileRepo.findUserByUsername(otherUsername);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.get_profile.user_not_found,
          undefined,
          errorCode.profile.get_profile.user_not_found,
        ),
      );
    }
    //check if current user got blocked
    const isBlocked = await this.profileRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.get_profile.user_not_found,
          undefined,
          errorCode.profile.get_profile.user_not_found,
        ),
      );
    }
    //convert relative path into url
    const avatarUrl = userFound.avatarRelativePath
      ? this.STORAGE_URL + userFound.avatarRelativePath
      : null;
    const backgroundImageUrl = userFound.backgroundImageRelativePath
      ? this.STORAGE_URL + userFound.backgroundImageRelativePath
      : null;
    //send response
    const profile = {
      email: userFound.email,
      username: userFound.username,
      displayName: userFound.displayName,
      dateOfBirth: userFound.dateOfBirth,
      gender: userFound.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return sendResponse(
      HttpStatus.OK,
      message.profile.get_profile.success,
      profile,
    );
  }
  /**
   * update user profile
   */
  async updateProfile(
    currentUser: AuthUser,
    updateProfileDTO: UpdateProfileDTO,
  ) {
    const { sub } = currentUser;
    //check if there is no field to update
    if (
      updateProfileDTO.dateOfBirth === undefined &&
      updateProfileDTO.displayName === undefined &&
      updateProfileDTO.gender === undefined
    ) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_profile.no_field_to_update,
          undefined,
          errorCode.profile.update_profile.no_field_to_update,
        ),
      );
    }
    //update
    const updateInfo = {
      displayName: updateProfileDTO.displayName,
      gender: updateProfileDTO.gender,
      dateOfBirth: updateProfileDTO.dateOfBirth,
    };
    const { updatedProfile, updateResult } =
      await this.profileRepo.updateAndGetProfile(sub, updateInfo);
    //check if there is no affected row
    if (
      !updateResult.affected ||
      updateResult.affected == 0 ||
      !updatedProfile
    ) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.profile.update_profile.user_not_found,
          undefined,
          errorCode.profile.update_profile.user_not_found,
        ),
      );
    }
    //convert relative path into url
    const avatarUrl = updatedProfile.avatarRelativePath
      ? this.STORAGE_URL + updatedProfile.avatarRelativePath
      : null;
    const backgroundImageUrl = updatedProfile.backgroundImageRelativePath
      ? this.STORAGE_URL + updatedProfile.backgroundImageRelativePath
      : null;
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return sendResponse(
      HttpStatus.OK,
      message.profile.update_profile.success,
      profile,
    );
  }
  /**
   * request update avatar
   */
  async requestAvatarPresignUrl(
    currentUser: AuthUser,
    avatarPresignDTO: AvatarPresignDTO,
  ) {
    const { sub } = currentUser;
    // Check if content length exceed the avatar max size
    if (avatarPresignDTO.contentLength > this.avatarMaxSize) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_avatar.invalid_size,
          undefined,
          errorCode.profile.update_avatar.invalid_size,
        ),
      );
    }
    // Generate presigned URL for the current user's avatar upload.
    const presignData = await this.storageService.generateAvatarPresignUrl(
      String(sub),
      avatarPresignDTO.contentType,
    );
    return sendResponse(
      HttpStatus.OK,
      message.profile.update_avatar.presign_success,
      presignData,
    );
  }

  async confirmAvatarUpload(
    currentUser: AuthUser,
    avatarConfirmDTO: AvatarConfirmDTO,
  ) {
    const { sub } = currentUser;
    const expectedKey = `temp/avatar/${sub}`;
    // Ensure the client reports the expected object key.
    if (avatarConfirmDTO.key !== expectedKey) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_avatar.invalid_key,
          undefined,
          errorCode.profile.update_avatar.invalid_key,
        ),
      );
    }
    const objectSize = await this.storageService.getObjectSize(
      avatarConfirmDTO.key,
    );
    // Prevent DB update if the upload is missing on storage.
    if (!objectSize) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_avatar.upload_not_found,
          undefined,
          errorCode.profile.update_avatar.upload_not_found,
        ),
      );
    }
    if (objectSize > this.avatarMaxSize) {
      await this.storageService.deleteObject(avatarConfirmDTO.key);
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_avatar.upload_too_large,
          undefined,
          errorCode.profile.update_avatar.upload_too_large,
        ),
      );
    }
    //Move object from temp into avatar
    const desinationKey = `avatar/${sub}`;
    await this.storageService.moveObject(expectedKey, desinationKey);
    //Store into database
    const { updatedProfile, updateResult } =
      await this.profileRepo.updateAndGetProfile(sub, {
        avatarRelativePath: desinationKey,
      });
    // Reject if the user record wasn't updated.
    if (
      !updateResult.affected ||
      updateResult.affected == 0 ||
      !updatedProfile
    ) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.profile.update_profile.user_not_found,
          undefined,
          errorCode.profile.update_profile.user_not_found,
        ),
      );
    }
    const avatarUrl = updatedProfile.avatarRelativePath
      ? this.STORAGE_URL + updatedProfile.avatarRelativePath
      : null;
    const backgroundImageUrl = updatedProfile.backgroundImageRelativePath
      ? this.STORAGE_URL + updatedProfile.backgroundImageRelativePath
      : null;
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return sendResponse(
      HttpStatus.OK,
      message.profile.update_avatar.success,
      profile,
    );
  }

  /**
   * request update background image
   */
  async requestBackgroundPresignUrl(
    currentUser: AuthUser,
    backgroundPresignDTO: BackgroundPresignDTO,
  ) {
    const { sub } = currentUser;
    // Check if content length exceed the background max size
    if (backgroundPresignDTO.contentLength > this.backgroundMaxSize) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_background.invalid_size,
          undefined,
          errorCode.profile.update_background.invalid_size,
        ),
      );
    }
    // Generate presigned URL for the current user's background upload.
    const presignData =
      await this.storageService.generateBackGroundImagePresignUrl(
        String(sub),
        backgroundPresignDTO.contentType,
      );
    return sendResponse(
      HttpStatus.OK,
      message.profile.update_background.presign_success,
      presignData,
    );
  }

  async confirmBackgroundUpload(
    currentUser: AuthUser,
    backgroundConfirmDTO: BackgroundConfirmDTO,
  ) {
    const { sub } = currentUser;
    const expectedKey = `temp/background_image/${sub}`;
    // Ensure the client reports the expected object key.
    if (backgroundConfirmDTO.key !== expectedKey) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_background.invalid_key,
          undefined,
          errorCode.profile.update_background.invalid_key,
        ),
      );
    }
    const objectSize = await this.storageService.getObjectSize(
      backgroundConfirmDTO.key,
    );
    // Prevent DB update if the upload is missing on storage.
    if (!objectSize) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_background.upload_not_found,
          undefined,
          errorCode.profile.update_background.upload_not_found,
        ),
      );
    }
    if (objectSize > this.backgroundMaxSize) {
      await this.storageService.deleteObject(backgroundConfirmDTO.key);
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.profile.update_background.upload_too_large,
          undefined,
          errorCode.profile.update_background.upload_too_large,
        ),
      );
    }
    //Move object from temp into background
    const desinationKey = `background_image/${sub}`;
    await this.storageService.moveObject(expectedKey, desinationKey);
    //store into database
    const { updatedProfile, updateResult } =
      await this.profileRepo.updateAndGetProfile(sub, {
        backgroundImageRelativePath: desinationKey,
      });
    // Reject if the user record wasn't updated.
    if (
      !updateResult.affected ||
      updateResult.affected == 0 ||
      !updatedProfile
    ) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.profile.update_profile.user_not_found,
          undefined,
          errorCode.profile.update_profile.user_not_found,
        ),
      );
    }
    const avatarUrl = updatedProfile.avatarRelativePath
      ? this.STORAGE_URL + updatedProfile.avatarRelativePath
      : null;
    const backgroundImageUrl = updatedProfile.backgroundImageRelativePath
      ? this.STORAGE_URL + updatedProfile.backgroundImageRelativePath
      : null;
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return sendResponse(
      HttpStatus.OK,
      message.profile.update_background.success,
      profile,
    );
  }
}
