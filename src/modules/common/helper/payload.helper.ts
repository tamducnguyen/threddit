import { UserEntity } from 'src/modules/entities/user.entity';

export function GeneratePayload(user: UserEntity) {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
  };
  return payload;
}
