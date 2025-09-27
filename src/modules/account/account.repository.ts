import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { SessionEntity } from '../token/session.entity';
import { CredentialEntity } from '../auth/entities/credential.entity';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    private readonly dataSource: DataSource,
  ) {}
  async revokeSessionByToken(accessToken: string) {
    return await this.sessionRepo.update(
      { token: accessToken },
      { isRevoked: true },
    );
  }
  async selectPassword(userId: string) {
    return await this.userRepo.findOne({
      where: { id: userId },
      relations: { credential: true },
    });
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
  async checkUsernameExist(username: string) {
    return await this.userRepo.exists({ where: { username: username } });
  }
  async updateUsername(id: string, username: string) {
    return await this.userRepo.update({ id: id }, { username: username });
  }
}
