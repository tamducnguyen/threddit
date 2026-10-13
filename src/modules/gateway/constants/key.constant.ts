// Per-user count of currently open sockets. The source of truth for whether a
// user is online; ref-counted so multiple tabs/devices don't flip each other.
export const connKey = (userId: number) => `presence:conn:${userId}`;
// Derived index: bit `userId` is set while the user is online. Lets a single
// BITCOUNT return the global online total cheaply.
export const ONLINE_BITMAP_KEY = 'presence:online';
// Safety net so a crashed server's connection counters self-expire instead of
// pinning users online forever. Comfortably exceeds Socket.IO's heartbeat
// window (pingInterval + pingTimeout), and is refreshed on every heartbeat, so
// it only lapses once the socket is genuinely gone.
export const CONN_TTL_SECONDS = 90;
// Epoch-ms timestamp written when a user's last socket disconnects.
export const lastSeenKey = (userId: number) => `presence:lastseen:${userId}`;
