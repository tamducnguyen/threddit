import { Injectable } from '@nestjs/common';
import {
  ProfileGetProfileTargetUserBlockException,
  ProfileGetProfileUserNotFoundException,
  ProfileSearchProfileCursorInvalidException,
  ProfileUpdateAvatarInvalidKeyException,
  ProfileUpdateAvatarInvalidSizeException,
  ProfileUpdateAvatarUploadNotFoundException,
  ProfileUpdateAvatarUploadTooLargeException,
  ProfileUpdateBackgroundInvalidKeyException,
  ProfileUpdateBackgroundInvalidSizeException,
  ProfileUpdateBackgroundUploadNotFoundException,
  ProfileUpdateBackgroundUploadTooLargeException,
  ProfileUpdateProfileNoFieldToUpdateException,
  ProfileUpdateProfileUserNotFoundException,
} from '../../common/exception';
import { ProfileRepository } from './profile.repository';
import { AuthUser } from '../token/authuser.interface';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDTO } from './dtos/updateprofile.dto';
import { AvatarPresignDTO } from './dtos/avatarpresign.dto';
import { AvatarConfirmDTO } from './dtos/avatarconfirm.dto';
import { BackgroundPresignDTO } from './dtos/backgroundpresign.dto';
import { BackgroundConfirmDTO } from './dtos/backgroundconfirm.dto';
import { StorageService } from '../storage/storage.service';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';
import { JwtService } from '@nestjs/jwt';
import { ProfileCursor } from './interfaces/profile-cursor.interface';

@Injectable()
export class ProfileService {
  private avatarMaxSize: number;
  private backgroundMaxSize: number;
  constructor(
    private readonly profileRepo: ProfileRepository,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
  ) {
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
    const profileFound = await this.profileRepo.getProfileByUserId(
      currentUser.sub,
    );
    if (!profileFound) {
      throw new ProfileGetProfileUserNotFoundException();
    }
    //convert relative path into url
    const avatarUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      profileFound.avatarRelativePath,
    );
    const backgroundImageUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      profileFound.backgroundImageRelativePath,
    );
    //send response
    const profile = {
      email: profileFound.email,
      username: profileFound.username,
      displayName: profileFound.displayName,
      bio: profileFound.bio,
      dateOfBirth: profileFound.dateOfBirth,
      gender: profileFound.gender,
      educationalLevel: profileFound.educationalLevel,
      relationshipStatus: profileFound.relationshipStatus,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
      followerNumber: profileFound.followerNumber,
      followingNumber: profileFound.followingNumber,
      friendNumber: profileFound.friendNumber,
    };
    return { kind: 'success', data: profile };
  }
  async getOtherProfile(currentUser: AuthUser, otherUsername: string) {
    //check if user exist
    const userFound = await this.profileRepo.findUserByUsername(otherUsername);
    if (!userFound) {
      throw new ProfileGetProfileUserNotFoundException();
    }
    //check if whose username is current user
    if (userFound.id === currentUser.sub) {
      return await this.getSelfProfile(currentUser);
    }
    //get profile
    const profileFound = await this.profileRepo.getOtherProfileByUserId(
      currentUser.sub,
      userFound.id,
    );
    if (!profileFound) {
      throw new ProfileGetProfileUserNotFoundException();
    }
    //check if current user got blocked
    const isBlocked = await this.profileRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new ProfileGetProfileUserNotFoundException();
    }
    //check if current user block target user
    const isTargetUserBlocked = await this.profileRepo.checkBlocked(
      userFound.id,
      currentUser.sub,
    );
    if (isTargetUserBlocked) {
      throw new ProfileGetProfileTargetUserBlockException();
    }
    return { kind: 'success', data: profileFound };
  }

  async searchProfiles(currentUserId: number, key: string, cursor?: string) {
    let profileCursor: ProfileCursor | undefined;
    if (cursor) {
      try {
        profileCursor =
          await this.jwtService.verifyAsync<ProfileCursor>(cursor);
      } catch {
        throw new ProfileSearchProfileCursorInvalidException();
      }
    } else {
      profileCursor = undefined;
    }
    const searchProfiles = await this.profileRepo.searchProfiles(
      currentUserId,
      key,
      profileCursor,
    );
    const finalProfile = searchProfiles[searchProfiles.length - 1];
    if (!finalProfile) {
      return { kind: 'no_content', data: { searchProfiles: [], cursor: null } };
    }
    const cursorPayload: ProfileCursor = {
      followerNumber: finalProfile.followerNumber,
      username: finalProfile.username,
    };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        searchProfiles: searchProfiles,
        cursor: nextCursor,
      },
    };
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
      updateProfileDTO.bio === undefined &&
      updateProfileDTO.gender === undefined &&
      updateProfileDTO.educationalLevel === undefined &&
      updateProfileDTO.relationshipStatus === undefined
    ) {
      throw new ProfileUpdateProfileNoFieldToUpdateException();
    }
    //update
    const updateInfo = {
      displayName: updateProfileDTO.displayName,
      bio: updateProfileDTO.bio,
      gender: updateProfileDTO.gender,
      dateOfBirth: updateProfileDTO.dateOfBirth,
      educationalLevel: updateProfileDTO.educationalLevel,
      relationshipStatus: updateProfileDTO.relationshipStatus,
    };
    const { updatedProfile, updateResult } =
      await this.profileRepo.updateAndGetProfile(sub, updateInfo);
    //check if there is no affected row
    if (
      !updateResult.affected ||
      updateResult.affected == 0 ||
      !updatedProfile
    ) {
      throw new ProfileUpdateProfileUserNotFoundException();
    }
    //convert relative path into url
    const avatarUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.avatarRelativePath,
    );
    const backgroundImageUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.backgroundImageRelativePath,
    );
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      bio: updatedProfile.bio,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      educationalLevel: updatedProfile.educationalLevel,
      relationshipStatus: updatedProfile.relationshipStatus,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return { kind: 'success', data: profile };
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
      throw new ProfileUpdateAvatarInvalidSizeException();
    }
    // Generate presigned URL for the current user's avatar upload.
    const presignData = await this.storageService.generateAvatarPresignUrl(
      String(sub),
      avatarPresignDTO.contentType,
    );
    return { kind: 'presign_success', data: presignData };
  }

  async confirmAvatarUpload(
    currentUser: AuthUser,
    avatarConfirmDTO: AvatarConfirmDTO,
  ) {
    const { sub } = currentUser;
    const expectedKey = `temp/avatar/${sub}`;
    // Ensure the client reports the expected object key.
    if (avatarConfirmDTO.key !== expectedKey) {
      throw new ProfileUpdateAvatarInvalidKeyException();
    }
    const objectSize = await this.storageService.getObjectSize(
      avatarConfirmDTO.key,
    );
    // Prevent DB update if the upload is missing on storage.
    if (!objectSize) {
      throw new ProfileUpdateAvatarUploadNotFoundException();
    }
    if (objectSize > this.avatarMaxSize) {
      await this.storageService.deleteObject(avatarConfirmDTO.key);
      throw new ProfileUpdateAvatarUploadTooLargeException();
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
      throw new ProfileUpdateProfileUserNotFoundException();
    }
    const avatarUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.avatarRelativePath,
    );
    const backgroundImageUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.backgroundImageRelativePath,
    );
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      bio: updatedProfile.bio,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return { kind: 'success', data: profile };
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
      throw new ProfileUpdateBackgroundInvalidSizeException();
    }
    // Generate presigned URL for the current user's background upload.
    const presignData =
      await this.storageService.generateBackGroundImagePresignUrl(
        String(sub),
        backgroundPresignDTO.contentType,
      );
    return { kind: 'presign_success', data: presignData };
  }

  async confirmBackgroundUpload(
    currentUser: AuthUser,
    backgroundConfirmDTO: BackgroundConfirmDTO,
  ) {
    const { sub } = currentUser;
    const expectedKey = `temp/background_image/${sub}`;
    // Ensure the client reports the expected object key.
    if (backgroundConfirmDTO.key !== expectedKey) {
      throw new ProfileUpdateBackgroundInvalidKeyException();
    }
    const objectSize = await this.storageService.getObjectSize(
      backgroundConfirmDTO.key,
    );
    // Prevent DB update if the upload is missing on storage.
    if (!objectSize) {
      throw new ProfileUpdateBackgroundUploadNotFoundException();
    }
    if (objectSize > this.backgroundMaxSize) {
      await this.storageService.deleteObject(backgroundConfirmDTO.key);
      throw new ProfileUpdateBackgroundUploadTooLargeException();
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
      throw new ProfileUpdateProfileUserNotFoundException();
    }
    const avatarUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.avatarRelativePath,
    );
    const backgroundImageUrl = ConvertMediaRelativePathToUrl(
      this.configService,
      updatedProfile.backgroundImageRelativePath,
    );
    const profile = {
      email: updatedProfile.email,
      displayName: updatedProfile.displayName,
      bio: updatedProfile.bio,
      dateOfBirth: updatedProfile.dateOfBirth,
      gender: updatedProfile.gender,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    return { kind: 'success', data: profile };
  }
}
