import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { CredentialEntity } from '../entities/credential.entity';
import { SessionEntity } from '../entities/session.entity';
import { OAuthAccountEntity } from '../entities/oauth.entity';
import { ProviderOauth } from '../enum/provideroauth.enum';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OAuthAccountEntity)
    private readonly oAuthAccountRepo: Repository<OAuthAccountEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    private readonly dataSource: DataSource,
  ) {}
  async checkEmailExist(email: string) {
    return await this.userRepo.exists({ where: { email: email } });
  }
  async checkUsernameExist(username: string) {
    return await this.userRepo.exists({ where: { username: username } });
  }
  async saveUserCredential(
    user: Partial<UserEntity>,
    credential: Partial<CredentialEntity>,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const userCreated = await userRepo.save(user);
      const credentialRepo = manager.getRepository(CredentialEntity);
      credential = { ...credential, user: userCreated };
      await credentialRepo.save(credential);
    });
  }
  async findUserViaEmail(email: string) {
    return await this.userRepo.findOne({
      where: { email: email },
      select: { id: true },
      relations: { credential: true },
    });
  }
  async saveSession(sessionEntity: Partial<SessionEntity>) {
    return await this.sessionRepo.save(sessionEntity);
  }
  async updatePasswordAndRevokeAllToken(
    credential_id: string,
    passwordHash: string,
    userEntity: UserEntity,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const credentialRepo = manager.getRepository(CredentialEntity);
      await credentialRepo.update(
        { id: credential_id },
        { hashedPassword: passwordHash },
      );
      const sessionRepo = manager.getRepository(SessionEntity);
      await sessionRepo.update({ user: userEntity }, { isRevoked: true });
    });
  }
  async saveUserOAuth(
    userEntity: Partial<UserEntity>,
    oAuthEntity: Partial<OAuthAccountEntity>,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const userCreated = await userRepo.save(userEntity);
      const oAuthRepo = manager.getRepository(OAuthAccountEntity);
      oAuthEntity = { ...oAuthEntity, user: userCreated };
      await oAuthRepo.save(oAuthEntity);
    });
  }
  async findOAuthAccount(provider: ProviderOauth, providerAccountId: string) {
    return await this.oAuthAccountRepo.findOne({
      relations: { user: true },
      where: { providerAccountId: providerAccountId, provider: provider },
    });
  }
}
