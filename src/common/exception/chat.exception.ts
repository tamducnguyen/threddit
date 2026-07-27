import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class ChatPinConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.pin.conversation_not_found;
  readonly message = message.chat.pin.conversation_not_found;
}

export class ChatPinPinLimitExceededException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.pin.pin_limit_exceeded;
  readonly message = message.chat.pin.pin_limit_exceeded;
}

export class ChatCreateGroupUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.create_group.user_not_found;
  readonly message = message.chat.create_group.user_not_found;
}

export class ChatCreateGroupMinMemberRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.create_group.min_member_required;
  readonly message = message.chat.create_group.min_member_required;
}

export class ChatMemberConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.member.conversation_not_found;
  readonly message = message.chat.member.conversation_not_found;
}

export class ChatMemberNotAGroupException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.member.not_a_group;
  readonly message = message.chat.member.not_a_group;
}

export class ChatMemberUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.member.user_not_found;
  readonly message = message.chat.member.user_not_found;
}

export class ChatMemberForbiddenException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.member.forbidden;
  readonly message = message.chat.member.forbidden;
}

export class ChatMemberNotAMemberException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.member.not_a_member;
  readonly message = message.chat.member.not_a_member;
}

export class ChatMemberAlreadyMemberException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.member.already_member;
  readonly message = message.chat.member.already_member;
}

export class ChatMemberTargetNotAMemberException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.member.target_not_a_member;
  readonly message = message.chat.member.target_not_a_member;
}

export class ChatMemberCannotDemoteLastAdminException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.member.cannot_demote_last_admin;
  readonly message = message.chat.member.cannot_demote_last_admin;
}

export class ChatEditMessageNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.edit_message.not_found;
  readonly message = message.chat.edit_message.not_found;
}

export class ChatEditMessageForbiddenException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.edit_message.forbidden;
  readonly message = message.chat.edit_message.forbidden;
}

export class ChatEditMessageRevokedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.edit_message.revoked;
  readonly message = message.chat.edit_message.revoked;
}

export class ChatEditMessageTextRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.edit_message.text_required;
  readonly message = message.chat.edit_message.text_required;
}

export class ChatPinMessageNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.pin_message.not_found;
  readonly message = message.chat.pin_message.not_found;
}

export class ChatPinMessageForbiddenException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.pin_message.forbidden;
  readonly message = message.chat.pin_message.forbidden;
}

export class ChatPinMessageLimitExceededException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.pin_message.limit_exceeded;
  readonly message = message.chat.pin_message.limit_exceeded;
}

export class ChatPinMessageNotAMemberException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.pin_message.not_a_member;
  readonly message = message.chat.pin_message.not_a_member;
}

export class ChatSearchMessagesConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.search_messages.conversation_not_found;
  readonly message = message.chat.search_messages.conversation_not_found;
}

export class ChatSearchMessagesCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.search_messages.cursor_invalid;
  readonly message = message.chat.search_messages.cursor_invalid;
}

export class ChatSendMessageRateLimitedException extends BaseServiceException {
  readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  readonly errorCode = errorCode.chat.rate_limit.send_message;
  readonly message = message.chat.rate_limit.send_message;
}

export class ChatTypingRateLimitedException extends BaseServiceException {
  readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  readonly errorCode = errorCode.chat.rate_limit.typing;
  readonly message = message.chat.rate_limit.typing;
}

export class ChatMarkReadConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.mark_read.conversation_not_found;
  readonly message = message.chat.mark_read.conversation_not_found;
}

export class ChatSendMessageInvalidTargetException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.send_message.invalid_target;
  readonly message = message.chat.send_message.invalid_target;
}

export class ChatSendMessageTextOrMediaRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.send_message.text_or_media_required;
  readonly message = message.chat.send_message.text_or_media_required;
}

export class ChatSendMessageUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.send_message.user_not_found;
  readonly message = message.chat.send_message.user_not_found;
}

export class ChatSendMessageCantMessageSelfException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.send_message.cant_message_self;
  readonly message = message.chat.send_message.cant_message_self;
}

export class ChatSendMessageConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.send_message.conversation_not_found;
  readonly message = message.chat.send_message.conversation_not_found;
}

export class ChatGetMessagesConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.get_messages.conversation_not_found;
  readonly message = message.chat.get_messages.conversation_not_found;
}

export class ChatGetMessagesCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.get_messages.cursor_invalid;
  readonly message = message.chat.get_messages.cursor_invalid;
}

export class ChatListConversationsCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.chat.list_conversations.cursor_invalid;
  readonly message = message.chat.list_conversations.cursor_invalid;
}

export class ChatRevokeMessageNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.revoke_message.not_found;
  readonly message = message.chat.revoke_message.not_found;
}

export class ChatRevokeMessageForbiddenException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.revoke_message.forbidden;
  readonly message = message.chat.revoke_message.forbidden;
}

export class ChatReactMessageNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.react_message.not_found;
  readonly message = message.chat.react_message.not_found;
}

export class ChatReactMessageNotAMemberException extends BaseServiceException {
  readonly statusCode = HttpStatus.FORBIDDEN;
  readonly errorCode = errorCode.chat.react_message.not_a_member;
  readonly message = message.chat.react_message.not_a_member;
}

export class ChatSummarizeConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.summarize.conversation_not_found;
  readonly message = message.chat.summarize.conversation_not_found;
}

export class ChatTopicsConversationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.chat.topics.conversation_not_found;
  readonly message = message.chat.topics.conversation_not_found;
}
