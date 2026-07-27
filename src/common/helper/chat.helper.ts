export const chatEvent = {
  ERROR: 'error',
  // Inbound: client sends a new message.
  SEND_MESSAGE: 'send_message',
  // Outbound: server broadcasts a new message to the conversation.
  NEW_MESSAGE: 'new_message',
  // Inbound: client revokes one of their messages.
  REVOKE_MESSAGE: 'revoke_message',
  // Outbound: server broadcasts that a message was revoked.
  MESSAGE_REVOKED: 'message_revoked',
  // Inbound: client edits the text of one of their messages.
  EDIT_MESSAGE: 'edit_message',
  // Outbound: server broadcasts that a message was edited.
  MESSAGE_EDITED: 'message_edited',
  // Inbound: client pins/unpins a message.
  PIN_MESSAGE: 'pin_message',
  // Outbound: server broadcasts a message's pin state changed.
  MESSAGE_PIN_CHANGED: 'message_pin_changed',
  // Inbound: client adds/updates a reaction on a message.
  REACT_MESSAGE: 'react_message',
  // Inbound: client removes their reaction from a message.
  UNREACT_MESSAGE: 'unreact_message',
  // Outbound: server broadcasts the aggregated reactions of a message.
  REACTION_UPDATED: 'reaction_updated',
  // Inbound: client signals it is (or stopped) typing in a conversation.
  TYPING: 'typing',
  // Outbound: server relays a peer's typing state to the conversation.
  USER_TYPING: 'user_typing',
  // Outbound: server announces a member was added to a conversation.
  MEMBER_ADDED: 'member_added',
  // Outbound: server announces a member was removed/left a conversation.
  MEMBER_REMOVED: 'member_removed',
  // Outbound: server announces a member's role changed.
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  // Inbound: client requests a presence snapshot for a set of users.
  GET_PRESENCE: 'get_presence',
  // Outbound: server replies to GET_PRESENCE with the requested presence list.
  PRESENCE_SNAPSHOT: 'presence_snapshot',
  // Outbound: server announces a user just came online.
  PRESENCE_ONLINE: 'presence_online',
  // Outbound: server announces a user just went offline (carries lastSeen).
  PRESENCE_OFFLINE: 'presence_offline',
  // Inbound: client marks messages as read up to a given message id.
  MARK_READ: 'mark_read',
  // Outbound: server broadcasts a read receipt to the rest of the conversation.
  READ_RECEIPT: 'read_receipt',
};

export const chatRoom = {
  // Personal room a socket joins on connection; used for targeted emits.
  user: (userId: number | string) => `user:${userId}`,
  // Room scoped to a conversation.
  conversation: (conversationId: number | string) =>
    `conversation:${conversationId}`,
};
