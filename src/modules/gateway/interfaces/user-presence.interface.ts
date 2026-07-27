export interface UserPresence {
  userId: number;
  isOnline: boolean;
  // Epoch milliseconds of when the user last went offline; null when the user
  // has been online since the server last started (no recorded last-seen).
  lastSeen: number | null;
}
