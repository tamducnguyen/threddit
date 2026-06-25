import { EducationalLevel } from 'src/enum/educationallevel.enum';
import { Gender } from 'src/enum/gender.enum';
import { RelationshipStatus } from 'src/enum/relationshipstatus.enum';

export interface Profile {
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
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
