import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

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
  async findUser(userId: number) {
    return await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        authMethod: true,
        authMethodKey: true,
      },
    });
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
  async updateUsernameAndRevokeAllSession(userId: number, newUsername: string) {
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      await userRepo.update({ id: userId }, { username: newUsername });
      const sessionRepo = manager.getRepository(SessionEntity);
      await sessionRepo
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ isRevoked: true })
        .where('user_id = :userId', { userId: userId })
        .execute();
    });
  }
  async deleteUserAndSessions(userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(SessionEntity);
      await sessionRepo
        .createQueryBuilder()
        .delete()
        .from(SessionEntity)
        .where('user_id = :userId', { userId: userId })
        .execute();
      const userRepo = manager.getRepository(UserEntity);
      await userRepo.delete({ id: userId });
    });
  }
}
