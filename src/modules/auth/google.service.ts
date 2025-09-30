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
import { GoogleSignUpDTO } from './dtos/googlesignup.dto';
import { GoogleData } from './interfaces/googledata.interface';
import { OAuthAccountEntity } from '../entities/oauth.entity';
import { ProviderOauth } from '../enum/provideroauth.enum';
import { sendResponse } from '../common/helper/response.helper';
import { GoogleSignInDTO } from './dtos/googlesingin.dto';
import { SessionEntity } from '../entities/session.entity';
import { sendCookie } from '../common/helper/cookie.helper';
import { Response } from 'express';
@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private GOOGLE_CLIENT_IDS = [];
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    this.client = new OAuth2Client(
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_WEB'),
      this.configService.getOrThrow('GOOGLE_SECRET_WEB'),
      this.configService.getOrThrow('GOOGLE_REDIRECT_URI_WEB'),
    );
    this.GOOGLE_CLIENT_IDS = [
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_WEB'),
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_ANDROID'),
      this.configService.getOrThrow('GOOGLE_CLIENT_ID_IOS'),
    ];
  }
  async googleAuth(googleCode: string) {
    //validate token and get payload
    const { tokens } = await this.client.getToken(googleCode);
    if (!tokens.id_token) {
      throw new UnauthorizedException(
        message.auth.google_auth.id_token_missing,
      );
    }
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.GOOGLE_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException(message.auth.google_auth.invalid_token);
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException(
        message.auth.google_auth.email_not_verified,
      );
    }
    const googleData: GoogleData = { email: payload.email, sub: payload.sub };
    return googleData;
  }
  /**
   *
   * @param googleSignUpDTO sign up with google
   * @returns
   */
  async googleSignUp(googleSignUpDTO: GoogleSignUpDTO) {
    const { username, googleCode } = googleSignUpDTO;
    const googleData = await this.googleAuth(googleCode);
    const { email, sub } = googleData;
    //check if email exist
    const isEmailExist = await this.authRepository.checkEmailExist(email);
    if (isEmailExist) {
      throw new BadRequestException(message.auth.google_signup.email_exists);
    }
    //check if username exist
    const isUsernameExist =
      await this.authRepository.checkUsernameExist(username);
    if (isUsernameExist) {
      throw new BadRequestException(message.auth.google_signup.username_exists);
    }
    //save user with oauth account
    const userEntity: Partial<UserEntity> = {
      email: email,
      username: username,
    };
    const oAuthAccountEntity: Partial<OAuthAccountEntity> = {
      provider: ProviderOauth.GOOGLE,
      providerAccountId: sub,
    };
    await this.authRepository.saveUserOAuth(userEntity, oAuthAccountEntity);
    return sendResponse(HttpStatus.OK, message.auth.google_signup.success);
  }
  /**
   * sign in with google
   * @param response
   * @param googleSignInDTO
   * @returns
   */
  async googleSignIn(response: Response, googleSignInDTO: GoogleSignInDTO) {
    const { googleCode } = googleSignInDTO;
    const googleData = await this.googleAuth(googleCode);
    const { sub } = googleData;
    const oAuthFound = await this.authRepository.findOAuthAccount(
      ProviderOauth.GOOGLE,
      sub,
    );
    if (!oAuthFound) {
      throw new BadRequestException(
        message.auth.google_signin.account_not_exists,
      );
    }
    const payload = { email: oAuthFound.user.email, sub: oAuthFound.user.id };
    const accessToken = await this.jwtService.signAsync(payload);
    const sessionEntity: Partial<SessionEntity> = {
      token: accessToken,
    };
    await this.authRepository.saveSession(sessionEntity);
    sendCookie(response, this.configService, 'accessToken', accessToken);
    return sendResponse(HttpStatus.OK, message.auth.google_signin.success, {
      accessToken,
    });
  }
}
