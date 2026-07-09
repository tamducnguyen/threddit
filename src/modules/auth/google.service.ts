import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Injectable } from '@nestjs/common';
import {
  AuthGoogleAuthAccountNotActivateException,
  AuthGoogleAuthAlreadyAuthMethodException,
  AuthGoogleAuthEmailNotVerifiedException,
  AuthGoogleAuthIdTokenMissingException,
  AuthGoogleAuthInvalidTokenException,
} from '../../common/exception';
import { AuthRepository } from './auth.repository';
import { UserEntity } from '../../entities/user.entity';
import { GoogleData } from './interfaces/googledata.interface';
import { cookieOptions, sendCookie } from '../../common/helper/cookie.helper';
import { Response } from 'express';
import { SessionService } from '../token/session.service';
import { GoogleCodeDTO } from './dtos/googlecode.dto';
import { AuthMethod } from '../../enum/authmethod.enum';
import { generateUniqueUsername } from '../../common/helper/username.helper';
@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private GOOGLE_CLIENT_IDS = [];
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    // Initialize Google OAuth client for exchanging code and verifying id_token.
    this.client = new OAuth2Client(
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_WEB'),
      this.configService.getOrThrow('GOOGLE_SECRET_WEB'),
      this.configService.getOrThrow('GOOGLE_REDIRECT_URI_WEB'),
    );
    // Accept tokens issued for any supported client (web/android/ios).
    this.GOOGLE_CLIENT_IDS = [
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_WEB'),
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_ANDROID'),
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_IOS'),
    ];
  }
  async googleAuth(googleCode: string) {
    // Exchange authorization code for tokens and validate id_token.
    const { tokens } = await this.client.getToken(googleCode);
    if (!tokens.id_token) {
      throw new AuthGoogleAuthIdTokenMissingException();
    }
    // Verify token audience and extract payload.
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.GOOGLE_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AuthGoogleAuthInvalidTokenException();
    }
    // Only allow verified Google emails.
    if (!payload.email_verified) {
      throw new AuthGoogleAuthEmailNotVerifiedException();
    }
    // Return minimal Google identity info for later steps.
    const googleData: GoogleData = { email: payload.email, sub: payload.sub };
    return googleData;
  }
  /**
   * sign in / sign up with google code
   */
  async googleCode(response: Response, googleCodeDTO: GoogleCodeDTO) {
    const { googleCode } = googleCodeDTO;
    // Validate Google code and extract identity.
    const googleData = await this.googleAuth(googleCode);
    const { email, sub } = googleData;
    // If user already exists, issue token and return.
    const userFound = await this.authRepository.findUser(email);
    if (userFound) {
      if (userFound.authMethod == AuthMethod.CREDENTIAL) {
        throw new AuthGoogleAuthAlreadyAuthMethodException();
      }
      if (userFound.isActivate == false) {
        throw new AuthGoogleAuthAccountNotActivateException();
      }
      // Create session and set auth cookie.
      const accessToken = await this.sessionService.createSession(userFound);
      sendCookie(
        response,
        this.configService,
        cookieOptions.name.THREDDIT_AUTH,
        accessToken,
      );
      return {
        kind: 'success',
        data: {
          userId: userFound.id,
          THREDDIT_AUTH: accessToken,
        },
      };
    }
    // Generate a globally unique username from email prefix.
    const baseUsername = email.split('@')[0];
    const username = await generateUniqueUsername(
      baseUsername,
      async (candidate) =>
        await this.authRepository.checkUsernameExist(candidate),
    );
    // Create a new user using Google identity and mark as activated.
    const userEntity: Partial<UserEntity> = {
      email: email,
      username: username,
      displayName: username,
      authMethod: AuthMethod.GOOGLE,
      authMethodKey: sub,
      isActivate: true,
    };
    const userCreated = await this.authRepository.createUser(userEntity);
    // Create session for the new user.
    const accessToken = await this.sessionService.createSession(
      userCreated as UserEntity,
    );
    sendCookie(
      response,
      this.configService,
      cookieOptions.name.THREDDIT_AUTH,
      accessToken,
    );
    return {
      kind: 'success',
      data: {
        userId: userCreated.id,
        AUTH_METHOD: userCreated.authMethod,
        THREDDIT_AUTH: accessToken,
      },
    };
  }
}
