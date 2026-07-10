import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class ContentCommentConfirmMediaFailedException extends BaseServiceException {
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly errorCode = errorCode.content.comment.confirm_media_failed;
  readonly message = message.content.comment.confirm_media_failed;
}

export class ContentCommentContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.comment.content_not_found;
  readonly message = message.content.comment.content_not_found;
}

export class ContentCommentOnlyOneMediaAllowedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.comment.only_one_media_allowed;
  readonly message = message.content.comment.only_one_media_allowed;
}

export class ContentCommentParentCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.comment.parent_comment_not_found;
  readonly message = message.content.comment.parent_comment_not_found;
}

export class ContentCommentTextOrMediaRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.comment.text_or_media_required;
  readonly message = message.content.comment.text_or_media_required;
}

export class ContentCommentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.comment.user_not_found;
  readonly message = message.content.comment.user_not_found;
}

export class ContentCreatePostConfirmMediaFailedException extends BaseServiceException {
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly errorCode = errorCode.content.create_post.confirm_media_failed;
  readonly message = message.content.create_post.confirm_media_failed;
}

export class ContentCreatePostStoryMustHaveOneMediaException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.create_post.story_must_have_one_media;
  readonly message = message.content.create_post.story_must_have_one_media;
}

export class ContentCreatePostTextOrMediaRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.create_post.text_or_media_required;
  readonly message = message.content.create_post.text_or_media_required;
}

export class ContentCreatePostUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.create_post.user_not_found;
  readonly message = message.content.create_post.user_not_found;
}

export class ContentDeleteCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_comment.not_found;
  readonly message = message.content.delete_comment.not_found;
}

export class ContentDeleteContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_content.not_found;
  readonly message = message.content.delete_content.not_found;
}

export class ContentDeleteReactionCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_reaction_comment.not_found;
  readonly message = message.content.delete_reaction_comment.not_found;
}

export class ContentDeleteReactionCommentNotReactedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.delete_reaction_comment.not_reacted;
  readonly message = message.content.delete_reaction_comment.not_reacted;
}

export class ContentDeleteReactionCommentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_reaction_comment.user_not_found;
  readonly message = message.content.delete_reaction_comment.user_not_found;
}

export class ContentDeleteReactionContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_reaction_content.not_found;
  readonly message = message.content.delete_reaction_content.not_found;
}

export class ContentDeleteReactionContentNotReactedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.delete_reaction_content.not_reacted;
  readonly message = message.content.delete_reaction_content.not_reacted;
}

export class ContentDeleteReactionContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.delete_reaction_content.user_not_found;
  readonly message = message.content.delete_reaction_content.user_not_found;
}

export class ContentGetChildCommentsNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_child_comments.not_found;
  readonly message = message.content.get_child_comments.not_found;
}

export class ContentGetCommentContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_comment.content_not_found;
  readonly message = message.content.get_comment.content_not_found;
}

export class ContentGetCommentCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_comment.cursor_invalid;
  readonly message = message.content.get_comment.cursor_invalid;
}

export class ContentGetContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_content.not_found;
  readonly message = message.content.get_content.not_found;
}

export class ContentGetDetailCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_detail_comment.not_found;
  readonly message = message.content.get_detail_comment.not_found;
}

export class ContentGetOtherCurrentStoryUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_other_current_story.user_not_found;
  readonly message = message.content.get_other_current_story.user_not_found;
}

export class ContentGetPinnedStoryUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_pinned_story.user_not_found;
  readonly message = message.content.get_pinned_story.user_not_found;
}

export class ContentGetTimelineContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.get_timeline_content.user_not_found;
  readonly message = message.content.get_timeline_content.user_not_found;
}

export class ContentPinContentAlreadyPinnedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.pin_content.already_pinned;
  readonly message = message.content.pin_content.already_pinned;
}

export class ContentPinContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.pin_content.not_found;
  readonly message = message.content.pin_content.not_found;
}

export class ContentPinContentOnlyOnePostAllowedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.pin_content.only_one_post_allowed;
  readonly message = message.content.pin_content.only_one_post_allowed;
}

export class ContentReactionCommentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.reaction_comment.already;
  readonly message = message.content.reaction_comment.already;
}

export class ContentReactionCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.reaction_comment.not_found;
  readonly message = message.content.reaction_comment.not_found;
}

export class ContentReactionCommentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.reaction_comment.user_not_found;
  readonly message = message.content.reaction_comment.user_not_found;
}

export class ContentReactionContentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.reaction_content.already;
  readonly message = message.content.reaction_content.already;
}

export class ContentReactionContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.reaction_content.not_found;
  readonly message = message.content.reaction_content.not_found;
}

export class ContentReactionContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.reaction_content.user_not_found;
  readonly message = message.content.reaction_content.user_not_found;
}

export class ContentSaveContentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.save_content.already;
  readonly message = message.content.save_content.already;
}

export class ContentSaveContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.save_content.not_found;
  readonly message = message.content.save_content.not_found;
}

export class ContentSaveContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.save_content.user_not_found;
  readonly message = message.content.save_content.user_not_found;
}

export class ContentShareContentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.share_content.already;
  readonly message = message.content.share_content.already;
}

export class ContentShareContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.share_content.not_found;
  readonly message = message.content.share_content.not_found;
}

export class ContentShareContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.share_content.user_not_found;
  readonly message = message.content.share_content.user_not_found;
}

export class ContentUnpinContentAlreadyUnpinnedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.unpin_content.already_unpinned;
  readonly message = message.content.unpin_content.already_unpinned;
}

export class ContentUnpinContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.unpin_content.not_found;
  readonly message = message.content.unpin_content.not_found;
}

export class ContentUnsaveContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.unsave_content.not_found;
  readonly message = message.content.unsave_content.not_found;
}

export class ContentUnsaveContentNotSaveException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.unsave_content.not_save;
  readonly message = message.content.unsave_content.not_save;
}

export class ContentUnsaveContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.unsave_content.user_not_found;
  readonly message = message.content.unsave_content.user_not_found;
}

export class ContentUnshareContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.unshare_content.not_found;
  readonly message = message.content.unshare_content.not_found;
}

export class ContentUnshareContentNotShareException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.unshare_content.not_share;
  readonly message = message.content.unshare_content.not_share;
}

export class ContentUnshareContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.unshare_content.user_not_found;
  readonly message = message.content.unshare_content.user_not_found;
}

export class ContentUpdateCommentConfirmMediaFailedException extends BaseServiceException {
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly errorCode = errorCode.content.update_comment.confirm_media_failed;
  readonly message = message.content.update_comment.confirm_media_failed;
}

export class ContentUpdateCommentMediaActionConflictException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = undefined;
  readonly message = message.content.update_comment.media_action_conflict;
}

export class ContentUpdateCommentNoFieldToUpdateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_comment.no_field_to_update;
  readonly message = message.content.update_comment.no_field_to_update;
}

export class ContentUpdateCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_comment.not_found;
  readonly message = message.content.update_comment.not_found;
}

export class ContentUpdateCommentOnlyOneMediaAllowedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_comment.only_one_media_allowed;
  readonly message = message.content.update_comment.only_one_media_allowed;
}

export class ContentUpdateCommentTextOrMediaRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_comment.text_or_media_required;
  readonly message = message.content.update_comment.text_or_media_required;
}

export class ContentUpdateContentInvalidMediaKeyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_content.invalid_media_key;
  readonly message = message.content.update_content.invalid_media_key;
}

export class ContentUpdateContentNoFieldToUpdateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_content.no_field_to_update;
  readonly message = message.content.update_content.no_field_to_update;
}

export class ContentUpdateContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_content.not_found;
  readonly message = message.content.update_content.not_found;
}

export class ContentUpdateContentStoryMustHaveOneMediaException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.content.update_content.story_must_have_one_media;
  readonly message = message.content.update_content.story_must_have_one_media;
}

export class ContentUpdateContentTextOrMediaRequiredException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_content.text_or_media_required;
  readonly message = message.content.update_content.text_or_media_required;
}

export class ContentUpdateReactionCommentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_reaction_comment.already;
  readonly message = message.content.update_reaction_comment.already;
}

export class ContentUpdateReactionCommentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_reaction_comment.not_found;
  readonly message = message.content.update_reaction_comment.not_found;
}

export class ContentUpdateReactionCommentNotReactedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_reaction_comment.not_reacted;
  readonly message = message.content.update_reaction_comment.not_reacted;
}

export class ContentUpdateReactionCommentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_reaction_comment.user_not_found;
  readonly message = message.content.update_reaction_comment.user_not_found;
}

export class ContentUpdateReactionContentAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_reaction_content.already;
  readonly message = message.content.update_reaction_content.already;
}

export class ContentUpdateReactionContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_reaction_content.not_found;
  readonly message = message.content.update_reaction_content.not_found;
}

export class ContentUpdateReactionContentNotReactedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_reaction_content.not_reacted;
  readonly message = message.content.update_reaction_content.not_reacted;
}

export class ContentUpdateReactionContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_reaction_content.user_not_found;
  readonly message = message.content.update_reaction_content.user_not_found;
}

export class ContentUpdateShareContentNoFieldToUpdateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.content.update_share_content.no_field_to_update;
  readonly message = message.content.update_share_content.no_field_to_update;
}

export class ContentUpdateShareContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_share_content.not_found;
  readonly message = message.content.update_share_content.not_found;
}

export class ContentUpdateShareContentNotShareException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.update_share_content.not_share;
  readonly message = message.content.update_share_content.not_share;
}

export class ContentUpdateShareContentUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.content.update_share_content.user_not_found;
  readonly message = message.content.update_share_content.user_not_found;
}

export class ContentGetTimelineContentCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_timeline_content.cursor_invalid;
  readonly message = message.content.get_timeline_content.cursor_invalid;
}

export class ContentGetSavedContentCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_saved_content.cursor_invalid;
  readonly message = message.content.get_saved_content.cursor_invalid;
}

export class ContentGetContentByKeyCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_content_by_key.cursor_invalid;
  readonly message = message.content.get_content_by_key.cursor_invalid;
}

export class ContentGetMyCurrentStoryCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_my_current_story.cursor_invalid;
  readonly message = message.content.get_my_current_story.cursor_invalid;
}

export class ContentGetOtherCurrentStoryCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_other_current_story.cursor_invalid;
  readonly message = message.content.get_other_current_story.cursor_invalid;
}

export class ContentGetMyStoryCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_my_story.cursor_invalid;
  readonly message = message.content.get_my_story.cursor_invalid;
}

export class ContentGetFriendStoryCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_friend_story.cursor_invalid;
  readonly message = message.content.get_friend_story.cursor_invalid;
}

export class ContentGetPinnedStoryCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.content.get_pinned_story.cursor_invalid;
  readonly message = message.content.get_pinned_story.cursor_invalid;
}
