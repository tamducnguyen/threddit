import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { message } from '../common/helper/message.helper';
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { UserEntity } from '../entities/user.entity';
import { GoogleData } from './interfaces/googledata.interface';
import { sendResponse } from '../common/helper/response.helper';
import { SessionEntity } from '../entities/session.entity';
import { cookieOptions, sendCookie } from '../common/helper/cookie.helper';
import { Response } from 'express';
import { GeneratePayload } from '../common/helper/payload.helper';
import { GoogleCodeDTO } from './dtos/googlecode.dto';
import { AuthMethod } from '../enum/authmethod.enum';
import { generateUniqueUsername } from '../common/helper/username.helper';
@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private GOOGLE_CLIENT_IDS = [];
  constructor(
    private readonly jwtService: JwtService,
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
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.auth.google_auth.id_token_missing,
        ),
      );
    }
    // Verify token audience and extract payload.
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.GOOGLE_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.auth.google_auth.invalid_token,
        ),
      );
    }
    // Only allow verified Google emails.
    if (!payload.email_verified) {
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.auth.google_auth.email_not_verified,
        ),
      );
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
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.auth.google_auth.already_auth_method,
          ),
        );
      }
      if (userFound.isActivate == false) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.auth.google_auth.account_not_activate,
          ),
        );
      }
      // Create session and set auth cookie.
      const payload = GeneratePayload(userFound);
      const accessToken = await this.jwtService.signAsync(payload);
      const sessionEntity: Partial<SessionEntity> = {
        user: userFound,
        token: accessToken,
      };
      await this.authRepository.saveSession(sessionEntity);
      sendCookie(
        response,
        this.configService,
        cookieOptions.name.THREDDIT_AUTH,
        accessToken,
      );
      return sendResponse(HttpStatus.OK, message.auth.google_auth.success, {
        THREDDIT_AUTH: accessToken,
      });
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
    // Issue token and save session for the new user.
    const payload = GeneratePayload(userCreated as UserEntity);
    const accessToken = await this.jwtService.signAsync(payload);
    const sessionEntity: Partial<SessionEntity> = {
      user: userCreated as UserEntity,
      token: accessToken,
    };
    await this.authRepository.saveSession(sessionEntity);
    sendCookie(
      response,
      this.configService,
      cookieOptions.name.THREDDIT_AUTH,
      accessToken,
    );
    return sendResponse(HttpStatus.OK, message.auth.google_auth.success, {
      AUTH_METHOD: userCreated.authMethod,
      THREDDIT_AUTH: accessToken,
    });
  }
}
