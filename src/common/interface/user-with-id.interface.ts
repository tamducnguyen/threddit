import { User } from './user.interface';

export interface UserWithId extends User {
  id: number;
}
