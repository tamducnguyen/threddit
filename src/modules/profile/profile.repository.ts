import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { DataSource, Repository } from 'typeorm';

export class ProfileRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly datasource: DataSource,
  ) {}
  async getProfileByUsername(username: string) {
    return await this.userRepo.findOne({
      where: { username: username },
      select: {
        email: true,
        displayName: true,
        username: true,
        avatarRelativePath: true,
        backgroundImageRelativePath: true,
        gender: true,
        dateOfBirth: true,
      },
    });
  }
  async getProfileById(userId: number) {
    return await this.userRepo.findOne({
      where: { id: userId },
      select: {
        email: true,
        displayName: true,
        username: true,
        avatarRelativePath: true,
        backgroundImageRelativePath: true,
        gender: true,
        dateOfBirth: true,
      },
    });
  }
  async checkUsernameExist(username: string) {
    return await this.userRepo.exists({ where: { username: username } });
  }
  async updateAndGetProfile(userId: number, updateInfo: Partial<UserEntity>) {
    return await this.datasource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const updateResult = await userRepo.update(userId, updateInfo);
      const updatedProfile = await userRepo.findOne({ where: { id: userId } });
      return { updateResult, updatedProfile };
    });
  }
}
