export interface Friend {
  friendshipId: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  friendshipStatus: 'accepted' | 'pending_sent' | 'pending_received' | null;
}
