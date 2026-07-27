/** The authenticated chat user: session subject plus the username resolved from DB at connection time. */
export interface ChatSocketUser {
  sub: number;
  username: string;
}

/** Shape of the per-socket `client.data` bag the chat gateway maintains. */
export interface ChatSocketData {
  // The authenticated user, attached on connection.
  user: ChatSocketUser;
  // Conversation ids the user belonged to at connection time, captured so the
  // disconnect handler can still target the right rooms after the socket has
  // started leaving them.
  conversationIds: number[];
}
