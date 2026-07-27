export const message = {
  auth: {
    signup: {
      success: 'Đăng ký thành công, vui lòng xác minh thông qua email',
      email_exists: 'Email đã tồn tại',
      username_exists: 'Username đã tồn tại',
      mail_throttled:
        'Chờ 60 giây trước khi yêu cầu gửi email đăng ký tiếp theo',
    },
    verify: {
      success: 'Xác minh tài khoản thành công',
      invalid_or_expired_code: 'Mã xác minh không hợp lệ hoặc đã hết hạn',
      too_many_attempts:
        'Xác minh quá nhiều lần, vui lòng chờ 5 phút để thử lại',
      already_verified: 'Tài khoản đã được xác minh trước đó',
    },
    resend_verification_code: {
      success: 'Gửi mã xác minh thành công',
      too_many_attempts:
        'Xác minh quá nhiều lần, vui lòng chờ 5 phút để thử lại',
      mail_throttled:
        'Chờ 60 giây trước khi yêu cầu gửi email đăng ký tiếp theo',
      already_verified: 'Tài khoản đã được xác minh trước đó',
      email_not_exists: 'Email không tồn tại',
    },
    signin: {
      credential_incorrect: 'Email hoặc mật khẩu không đúng, vui lòng thử lại',
      success: 'Đăng nhập thành công',
      account_not_activate:
        'Tài khoản của bạn chưa được kích hoạt! Vui lòng xác thực để kích hoạt tài khoản',
    },
    reset_password: {
      success:
        'Yêu cầu đặt lại mật khẩu thành công, vui lòng xác minh thông qua email',
      mail_throttled:
        'Chờ 60 giây trước khi gửi yêu cầu gửi email đặt lại mật khẩu tiếp theo',
    },
    verify_reset_password: {
      invalid_or_expired_code: 'Mã xác minh không hợp lệ hoặc đã hết hạn',
      email_not_exists: 'Email không tồn tại',
      too_many_attempts:
        'Xác minh quá nhiều lần, vui lòng chờ 5 phút để thử lại',
      success: 'Yêu cầu đặt lại mật khẩu thành công',
    },
    google_auth: {
      success: 'Đăng nhập thành công',
      already_auth_method:
        'Email này đã được đăng ký bằng phương thức đăng nhập khác. Vui lòng đăng nhập bằng phương thức đã sử dụng trước đó.',
      account_not_activate:
        'Tài khoản của bạn chưa được kích hoạt! Vui lòng xác thực để kích hoạt tài khoản',
      id_token_missing: 'Google không trả về id_token',
      invalid_token: 'Mã xác minh Google không hợp lệ',
      email_not_verified: 'Email không được xác minh bởi Google',
    },
  },
  account: {
    delete_account: {
      mail_sent: 'Đã gửi mã xác minh thông qua email',
      success: 'Xóa tài khoản thành công',
      user_not_found: 'Người dùng không tồn tại',
      mail_throttled: 'Chờ 60s trước khi yêu cầu xóa tài khoản tiếp theo',
      invalid_or_expired_code: 'Mã xác minh không hợp lệ hoặc đã hết hạn',
      too_many_attempts: 'Thử quá nhiều lần, vui lòng thử lại sau 5 phút',
    },
    signout: {
      success: 'Đăng xuất thành công',
    },
    update_password: {
      passport_same: 'Mật khẩu mới không được giống với mật khẩu cũ',
      password_mismatch: 'Mật khẩu không khớp',
      user_not_found: 'Người dùng không tồn tại',
      password_incorrect:
        'Mật khẩu hiện tại không đúng. Vui lòng đăng nhập lại',
      success: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại để tiếp tục',
      not_support_this_auth_method:
        'Tính năng không hỗ trợ phương đăng nhập này',
    },
    update_username: {
      user_not_found: 'Người dùng không tồn tại',
      username_exist:
        'Tên người dùng đã tồn tại, vui lòng chọn lại tên người dùng khác',
      success: 'Đổi tên người dùng thành công',
      username_duplicate: 'Username không được trùng với username cũ',
    },
    get_user_info: {
      user_not_found: 'Người dùng không tồn tại',
      success: 'Lấy thông tin người dùng thành công',
    },
  },
  profile: {
    get_profile: {
      success: 'Lấy hồ sơ người dùng thành công',
      user_not_found: 'Người dùng không tồn tại',
    },
    search_profile: {
      success: 'Tìm kiếm hồ sơ người dùng thành công',
      no_content: 'Đã hết danh sách hoặc không tìm thấy hồ sơ phù hợp',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    update_profile: {
      no_field_to_update: 'Không có trường thông tin nào để cập nhật',
      user_not_found: 'Người dùng không tồn tại',
      success: 'Cập nhật hồ sơ người dùng thành công',
      username_exist: 'Tên người dùng đã tồn tại',
    },
    update_avatar: {
      presign_success: 'Tạo presign avatar thành công',
      invalid_key: 'Key avatar không hợp lệ',
      upload_not_found: 'Không tìm thấy avatar đã upload',
      success: 'Cập nhật avatar thành công',
      invalid_size: 'Kích thước vượt quá giới hạn dung lượng',
      upload_too_large: 'Avatar vượt quá giới hạn dung lượng',
    },
    update_background: {
      presign_success: 'Tạo presign background thành công',
      invalid_key: 'Key background không hợp lệ',
      upload_not_found: 'Không tìm thấy background đã upload',
      invalid_size: 'Kích thước vượt quá giới hạn dung lượng',
      upload_too_large: 'Background vượt quá giới hạn dung lượng',
      success: 'Cập nhật background thành công',
    },
  },
  storage: {
    upload_failed: 'Quá trình tải tệp lên thất bại, vui lòng thử lại.',
    request_upload_success: 'Yêu cầu upload thành công',
    content_not_found: 'Không tìm thấy nội dung',
    invalid_media_file_number: 'Số lượng media không hợp lệ',
    invalid_upload_session_id: 'Upload session id không hợp lệ',
    media_file_too_large: 'Mỗi media file tối đa 500MB',
    invalid_media_content_type: 'Media content type không hợp lệ',
    invalid_media_key: 'Media key không hợp lệ',
    story_must_have_one_media: 'Story chỉ được đính kèm một tệp đính kèm',
    invalid_content_type: 'Loại tập tin không hợp lệ',
    invalid_key: 'Key lưu trữ không hợp lệ',
    object_not_found: 'Không tìm thấy đối tượng lưu trữ',
  },
  notification: {
    create_stream: { user_not_found: 'Người dùng không tồn tại' },
    get_notification: {
      user_not_found: 'Người dùng không tồn tại',
      no_content: 'Không có thông báo hoặc đã hết danh sách',
      success: 'Lấy danh sách thông báo thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_unread_notification: {
      user_not_found: 'Người dùng không tồn tại',
      no_content: 'Không có thông báo hoặc đã hết danh sách',
      success: 'Lấy danh sách thông báo chưa đọc thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    read_notification: {
      not_found_or_already_read: 'Thông báo không tồn tại hoặc đã đọc',
      success: 'Đã chuyển trạng thái đọc thành công',
    },
    delete_notification: {
      not_found: 'Không tìm thấy thông báo',
      success: 'Xóa thông báo thành công',
    },
    get_count_unread: {
      user_not_found: 'Người dùng không tồn tại',
      success: 'Lấy số lượng thông báo chưa đọc thành công',
    },
    read_all_notifications: {
      success: 'Đánh dấu đã đọc toàn bộ thông báo thành công',
    },
  },
  follow: {
    get_follow_number: {
      success: 'Lấy thông tin số lượng theo dõi thành công',
      user_not_found: 'Người dùng không tồn tại',
    },
    get_follower_list: {
      user_not_found: 'Người dùng không tồn tại',
      success: 'Lấy danh sách người theo dõi thành công',
      no_content: 'Không có người theo dõi hoặc đã hết danh sách',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_following_list: {
      user_not_found: 'Người dùng không tồn tại',
      no_content: 'Không có đang theo dõi hoặc đã hết danh sách',
      success: 'Lấy danh sách đang theo dõi thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    post_follow: {
      user_not_found: 'Người dùng không tồn tại',
      follow_already: 'Đã theo dõi người dùng này',
      cant_self_follow: 'Không thể follow chính mình',
      success: 'Theo dõi thành công',
    },
    delete_follow: {
      user_not_found: 'Người dùng không tồn tại',
      follow_not_found: 'Chưa theo dõi người dùng này',
      success: 'Hủy theo dõi thành công',
    },
    get_follow_state: {
      user_not_found: 'Người dùng không tồn tại',
      can_not_self_check: 'Yêu cầu không hợp lệ',
      sucess: 'Lấy trạng thái theo dõi thành công',
    },
  },
  friendship: {
    send_request: {
      cant_self_request: 'Không thể gửi lời mời kết bạn cho chính mình',
      user_not_found: 'Không tìm thấy người dùng này, hãy thử lại',
      friendship_exists: 'Bạn và người dùng này đã là bạn bè',
      request_already_sent: 'Đã gửi lời mời kết bạn trước đó',
      friendship_accepted:
        'Người này đã gửi lời mời cho bạn trước đó. Bây giờ cả hai đã là bạn bè',
      success: 'Gửi lời mời kết bạn thành công',
    },
    get_received_requests: {
      success: 'Lấy danh sách lời mời kết bạn đã nhận thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_sent_requests: {
      success: 'Lấy danh sách lời mời kết bạn đã gửi thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    accept_request: {
      success: 'Chấp nhận kết bạn thành công',
      request_not_found: 'Không tìm thấy lời mời kết bạn',
    },
    reject_request: {
      success: 'Từ chối kết bạn thành công',
      request_not_found: 'Không tìm thấy lời mời kết bạn',
    },
    cancel_request: {
      success: 'Hủy lời mời kết bạn thành công',
      request_not_found: 'Không tìm thấy lời mời kết bạn',
    },
    get_friend_list: {
      success: 'Lấy danh sách bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_mutual_friend_list: {
      success: 'Lấy danh sách bạn bè chung thành công',
      user_not_found: 'Không tìm thấy người dùng',
      cursor_invalid: 'Con trỏ không hợp lệ',
      cant_self_get: 'Lấy danh sách bạn chung không hợp lệ',
    },
    get_friend_count: {
      success: 'Lấy số lượng bạn bè thành công',
    },
    get_user_friend_count: {
      success: 'Lấy số lượng bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
    },
    get_friend_status: {
      success: 'Lấy trạng thái bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
      cant_self_check: 'Lấy trạng thái không hợp lệ',
    },
    unfriend: {
      success: 'Hủy kết bạn thành công',
      user_not_found: 'Không tìm thấy người dùng',
      friend_not_found: 'Không tìm thấy bạn bè',
      cant_self_unfriend: 'Hủy kết bạn không hợp lệ',
    },
    get_mutual_friend_count: {
      success: 'Lấy số lượng bạn chung thành công',
      user_not_found: 'Không tìm thấy người dùng',
      cant_self_get: 'Lấy số lượng bạn chung không hợp lệ',
    },
    get_sent_request_count: {
      success: 'Lấy số lượng yêu cầu kết bạn đã gửi thành công',
    },
    get_received_request_count: {
      success: 'Lấy số lượng yêu cầu kết bạn đã nhận thành công',
    },
  },
  content: {
    get_timeline_content: {
      user_not_found: 'Người dùng không tồn tại',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có bài đăng hoặc đã hết danh sách',
      success: 'Lấy danh sách hoạt thành công',
    },
    get_saved_content: {
      user_not_found: 'Người dùng không tồn tại',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có bài đăng hoặc đã hết danh sách',
      success: 'Lấy danh sách bài đăng đã lưu thành công',
    },
    get_friend_story: {
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có story từ bạn bè hoặc đã hết danh sách',
      success: 'Lấy danh sách story của bạn bè thành công',
    },
    get_my_story: {
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có story hoặc đã hết danh sách',
      success: 'Lấy danh sách story của bạn thành công',
    },
    get_my_current_story: {
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có story hiện tại hoặc đã hết danh sách',
      success: 'Lấy danh sách story hiện tại của bạn thành công',
    },
    get_other_current_story: {
      user_not_found: 'Người dùng không tồn tại',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content:
        'Không có story hiện tại của người dùng này hoặc đã hết danh sách',
      success: 'Lấy danh sách story hiện tại của người dùng thành công',
    },
    get_pinned_story: {
      user_not_found: 'Người dùng không tồn tại',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Không có story đã ghim hoặc đã hết danh sách',
      success: 'Lấy danh sách story đã ghim thành công',
    },
    pin_content: {
      not_found: 'Không tìm thấy nội dung của bạn',
      already_pinned: 'Nội dung đã được ghim trước đó',
      only_one_post_allowed: 'Bạn chỉ có thể ghim một bài viết',
      success: 'Ghim nội dung thành công',
    },
    unpin_content: {
      not_found: 'Không tìm thấy nội dung của bạn',
      already_unpinned: 'Bài viết chưa được ghim',
      success: 'Bỏ ghim bài viết thành công',
    },
    create_post: {
      user_not_found: 'Không tìm thấy người dùng',
      success: 'Đăng tải nội dung thành công',
      text_or_media_required:
        'Nội dung phải có nội dung văn bản hoặc ít nhất 1 tệp media',
      gen_media_presigned_url_failed:
        'Không thể tạo URL upload media, vui lòng thử lại',
      story_must_have_one_media: 'Story chỉ được đính kèm một tệp đính kèm',
      confirm_content_not_found:
        'Không tìm thấy bài viết để xác nhận tải tệp media.',
      confirm_media_failed:
        'Không thể xác nhận media cho nội dung, vui lòng thử lại.',
    },
    delete_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy nội dung của bạn',
      success: 'Xóa nội dung thành công',
    },
    save_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Lưu bài thành công',
      already: 'Bạn đã lưu bài viết',
    },
    unsave_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Bỏ lưu bài viết thành công',
      not_save: 'Bạn chưa lưu bài viết',
    },
    share_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Chia sẻ bài viết thành công',
      already: 'Bạn đã chia sẻ bài viết này',
    },
    update_share_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Cập nhật chia sẻ bài viết thành công',
      not_share: 'Bạn chưa chia sẻ bài viết này',
      no_field_to_update: 'Không có nội dung để cập nhật',
    },
    unshare_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Hủy chia sẻ bài viết thành công',
      not_share: 'Bạn chưa chia sẻ bài viết này',
    },
    reaction_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Thả cảm xúc bài viết thành công',
      already: 'Bạn đã thả cảm xúc bài viết này trước đó',
    },
    update_reaction_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Cập nhật cảm xúc bài viết thành công',
      not_reacted: 'Bạn chưa thả cảm xúc bài viết này',
      already: 'Bạn đã thả cảm xúc kiểu này',
    },
    delete_reaction_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết',
      success: 'Bỏ cảm xúc bài viết thành công',
      not_reacted: 'Bạn chưa thả cảm xúc bài viết này',
    },
    reaction_comment: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bình luận',
      success: 'Thả cảm xúc bình luận thành công',
      already: 'Bạn đã thả cảm xúc bình luận này trước đó',
    },
    update_reaction_comment: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bình luận',
      success: 'Cập nhật cảm xúc bình luận thành công',
      not_reacted: 'Bạn chưa thả cảm xúc bình luận này',
      already: 'Bạn đã thả cảm xúc kiểu này',
    },
    delete_reaction_comment: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bình luận',
      success: 'Bỏ cảm xúc bình luận thành công',
      not_reacted: 'Bạn chưa thả cảm xúc bình luận này',
    },
    update_content: {
      not_found: 'Không tìm thấy nội dung của bạn',
      no_field_to_update: 'Không có nội dung để cập nhật',
      text_or_media_required:
        'Nội dung phải có nội dung văn bản hoặc ít nhất 1 tệp media',
      story_must_have_one_media: 'Story chỉ được đính kèm một tệp đính kèm',
      invalid_media_key: 'Media key không hợp lệ',
      success: 'Chỉnh sủa nội dung thành công',
    },
    get_content: {
      success: 'Lấy chi tiết nội dung thành công',
      not_found: 'Không tìm thấy nội dung',
    },
    get_feed: {
      success: 'Lấy bảng tin thành công',
      no_content: 'Đã hết bài đăng',
    },
    get_reel: {
      success: 'Lấy danh sách reel thành công',
      no_content: 'Đã hết reel',
    },
    get_following_content: {
      success: 'Lấy bảng tin từ người bạn đang theo dõi thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Đã hết danh sách bài đăng hoặc không có bài đăng nào',
    },
    get_content_by_key: {
      success: 'Tìm kiếm bài đăng thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Đã hết danh sách bài đăng hoặc không có bài đăng nào',
    },
    listen_comment: {
      content_not_found: 'Không tìm thấy bài viết',
    },
    comment: {
      content_not_found: 'Không tìm thấy bài viết',
      parent_comment_not_found: 'Không tìm thấy bình luận cha',
      user_not_found: 'Không tìm thấy người dùng',
      text_or_media_required:
        'Bình luận phải có nội dung văn bản hoặc một tệp media',
      only_one_media_allowed: 'Bình luận chỉ được đính kèm một tệp media',
      confirm_media_failed: 'Upload thất bại, vui lòng thử lại',
      success: 'Bình luận bài viết thành công',
    },

    get_comment: {
      content_not_found: 'Không tìm thấy bài viết',
      cursor_invalid: 'Con trỏ không hợp lệ',
      no_content: 'Đã hết bình luận hoặc không có bình luận',
      success: 'Lấy danh sách bình luận thành công',
    },

    delete_comment: {
      not_found: 'Không tìm thấy bình luận của bạn',
      success: 'Xóa bình luận thành công',
    },

    get_detail_comment: {
      not_found: 'Không tìm thấy bình luận',
      success: 'Lấy bình luận thành công',
    },
    get_child_comments: {
      not_found: 'Không tìm thấy bình luận',
    },
    update_comment: {
      confirm_media_failed: 'Upload thất bại, vui lòng thử lại',
      no_field_to_update: 'Không có nội dung để cập nhật',
      text_or_media_required:
        'Bình luận phải có nội dung văn bản hoặc một tệp media',
      only_one_media_allowed: 'Bình luận chỉ được đính kèm một tệp media',
      media_action_conflict:
        'Hành động cập nhập tệp phương tiện mâu thuẫn, chỉ được xóa hoặc cập nhật thay thế',
      not_found: 'Không tìm thấy bình luận của bạn',
      success: 'Cập nhật bình luận thành công',
    },
  },
  block: {
    post_block: {
      success: 'Chặn người dùng thành công',
      user_not_found: 'Người dùng không tồn tại',
      cant_self_block: 'Không thể chặn chính mình',
      already_blocked: 'Bạn đã chặn người dùng này trước đó',
    },
    delete_block: {
      success: 'Gỡ chặn người dùng này thành công',
      user_not_found: 'Người dùng không tồn tại',
      cant_self_unblock: 'KHông thể gỡ chặn chính mình',
      not_blocked: 'Bạn chưa chặn người dùng này',
    },
    get_blocked_list: {
      success: 'Lấy danh sách người bạn đã chặn thành công',
      user_not_found: 'Người dùng không tồn tại',
      cursor_invalid: 'Con trở không hợp lệ',
    },
    get_block_status: {
      success: 'Lấy trạng thái chặn thành công',
      user_not_found: 'Không tìm thấy người dùng',
      cant_self_check: 'Không thể kiếm tra chính mình',
    },
    get_blocked_user_count: {
      success: 'Lấy số lượng người đã chặn thành công',
    },
  },
  chat: {
    connection: {
      token_missing: 'Thiếu token xác thực',
      token_invalid: 'Token không hợp lệ',
    },
    send_message: {
      success: 'Gửi tin nhắn thành công',
      text_or_media_required:
        'Tin nhắn phải có nội dung văn bản hoặc một tệp media',
      invalid_target:
        'Yêu cầu phải có id cuộc trò chuyện hoặc id người nhận, không được cả hai',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      cant_message_self: 'Không thể nhắn tin cho chính mình',
      user_not_found: 'Không tìm thấy người dùng',
      conversation_exist:
        'Giữa hai người dùng đã tồn tại cuộc trò chuyện hãy sủ dụng id của conversation để thay thế',
    },
    get_messages: {
      success: 'Lấy danh sách tin nhắn thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    list_conversations: {
      success: 'Lấy danh sách cuộc trò chuyện thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    search_conversations: {
      success: 'Tìm kiếm cuộc trò chuyện thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    unread_count: {
      success: 'Lấy số tin nhắn chưa đọc thành công',
    },
    pin: {
      pin_success: 'Ghim cuộc trò chuyện thành công',
      unpin_success: 'Bỏ ghim cuộc trò chuyện thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
      pin_limit_exceeded: 'Bạn đã đạt giới hạn số cuộc trò chuyện được ghim',
    },
    revoke_message: {
      success: 'Thu hồi tin nhắn thành công',
      not_found: 'Không tìm thấy tin nhắn',
      forbidden: 'Bạn không có quyền thu hồi tin nhắn này',
    },
    react_message: {
      success: 'Thả cảm xúc tin nhắn thành công',
      update_success: 'Cập nhật cảm xúc tin nhắn thành công',
      remove_success: 'Bỏ cảm xúc tin nhắn thành công',
      not_found: 'Không tìm thấy tin nhắn',
      already: 'Bạn đã thả cảm xúc kiểu này',
      not_reacted: 'Bạn chưa thả cảm xúc tin nhắn này',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
    },
    create_group: {
      success: 'Tạo nhóm trò chuyện thành công',
      min_member_required: 'Nhóm phải có ít nhất 3 thành viên',
      user_not_found: 'Không tìm thấy người dùng',
    },
    member: {
      add_success: 'Thêm thành viên thành công',
      remove_success: 'Xóa thành viên thành công',
      leave_success: 'Rời nhóm thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      not_a_group: 'Cuộc trò chuyện này không phải là nhóm',
      user_not_found: 'Không tìm thấy người dùng',
      forbidden: 'Bạn không có quyền thực hiện hành động này',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
      already_member: 'Người dùng đã là thành viên của nhóm',
      target_not_a_member: 'Người dùng không phải là thành viên của nhóm',
      cannot_demote_last_admin:
        'Nhóm phải có ít nhất một quản trị viên, hãy chỉ định người khác làm quản trị viên trước',
      role_changed: 'Cập nhật vai trò thành viên thành công',
    },
    summarize: {
      success: 'Tóm tắt cuộc trò chuyện thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
    },
    topics: {
      success: 'Phát hiện chủ đề thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
    },
    mark_read: {
      success: 'Đánh dấu đã đọc thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
    },
    edit_message: {
      success: 'Sửa tin nhắn thành công',
      not_found: 'Không tìm thấy tin nhắn',
      forbidden: 'Bạn không có quyền sửa tin nhắn này',
      revoked: 'Không thể sửa tin nhắn đã bị thu hồi',
      text_required: 'Nội dung tin nhắn không được để trống',
    },
    read_receipts: {
      success: 'Lấy danh sách người đã đọc thành công',
    },
    pin_message: {
      pin_success: 'Ghim tin nhắn thành công',
      unpin_success: 'Bỏ ghim tin nhắn thành công',
      list_success: 'Lấy danh sách tin nhắn đã ghim thành công',
      not_found: 'Không tìm thấy tin nhắn',
      forbidden: 'Bạn không có quyền ghim tin nhắn trong nhóm này',
      limit_exceeded:
        'Đã đạt giới hạn số tin nhắn được ghim trong hội thoại này',
      not_a_member: 'Bạn không phải là thành viên của cuộc trò chuyện này',
    },
    search_messages: {
      success: 'Tìm kiếm tin nhắn thành công',
      conversation_not_found: 'Không tìm thấy cuộc trò chuyện',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    rate_limit: {
      send_message: 'Bạn đang gửi tin nhắn quá nhanh, vui lòng thử lại sau',
      typing: 'Bạn đang gửi trạng thái nhập quá nhanh, vui lòng thử lại sau',
    },
    typing: {
      relay: 'Trạng thái đang gõ phím',
    },
    presence: {
      online: 'Người dùng đang online',
      offline: 'Người dùng đã offline',
      snapshot: 'Lấy trạng thái hoạt động thành công',
    },
    error: {
      internal: 'Đã xảy ra lỗi, vui lòng thử lại',
    },
  },
  common: {
    too_many_requests: 'Thao tác quá nhanh, vui lòng thử lại sau.',
    session_revoked: 'Phiên đã hết hạn, vui lòng đăng nhập lại',
    token_not_found: 'Không tìm thấy mã xác minh',
    account_not_activate:
      'Tài khoản của bạn đang không được kích hoạt! Vui lòng liên hệ với quản trị viên để biết lý do',
    blocked_or_not_found: 'Người dùng không tồn tại',
    self_blocked_target: 'Bạn đã chặn người dùng này',
  },
  http: {
    check_toxic: {
      toxic: 'Xuất hiện ngôn từ nhạy cảm, xin hãy văn minh',
    },
    common: {
      time_out: 'Lỗi timeout, xin thử lại',
    },
  },
};
