import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { AuthMethod } from '../enum/authmethod.enum';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
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
  async createUser(user: Partial<UserEntity>) {
    return await this.userRepo.save(user);
  }
  async updateUserActivation(userId: number, isActivate: boolean) {
    return await this.userRepo.update(
      { id: userId },
      { isActivate: isActivate },
    );
  }
  async deleteUserByEmail(email: string) {
    return await this.userRepo.delete({ email: email });
  }
  async findUserCredential(email: string) {
    return await this.userRepo.findOne({
      where: { email: email, authMethod: AuthMethod.CREDENTIAL },
      select: {
        id: true,
        email: true,
        username: true,
        authMethod: true,
        authMethodKey: true,
        isActivate: true,
      },
    });
  }
  async findUser(email: string) {
    return await this.userRepo.findOne({
      where: { email: email },
      select: {
        id: true,
        email: true,
        username: true,
        authMethod: true,
        authMethodKey: true,
        isActivate: true,
      },
    });
  }
  async saveSession(sessionEntity: Partial<SessionEntity>) {
    return await this.sessionRepo.save(sessionEntity);
  }
  async updatePasswordAndRevokeAllToken(userId: number, passwordHash: string) {
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      await userRepo.update({ id: userId }, { authMethodKey: passwordHash });
      const sessionRepo = manager.getRepository(SessionEntity);
      await sessionRepo
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ isRevoked: true })
        .where('user_id = :userId', { userId: userId })
        .execute();
    });
  }
}
