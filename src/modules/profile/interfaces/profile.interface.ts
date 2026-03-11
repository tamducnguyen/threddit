import { EducationalLevel } from 'src/modules/enum/educationallevel.enum';
import { Gender } from 'src/modules/enum/gender.enum';
import { RelationshipStatus } from 'src/modules/enum/relationshipstatus.enum';

export interface Profile {
  email: string;
  username: string;
  displayName: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  educationalLevel: EducationalLevel | null;
  relationshipStatus: RelationshipStatus | null;
  avatarUrl: string;
  backgroundImageUrl: string;
  followerNumber: number;
  followingNumber: number;
  friendNumber: number;
  friendshipStatus: 'pending_sent' | 'pending_received' | 'accepted' | null;
  isFollowing: boolean;
  mutualFriendNumber: number;
}
