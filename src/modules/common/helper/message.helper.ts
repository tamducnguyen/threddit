export const message = {
  auth: {
    signup: {
      success: 'Đăng ký thành công, vui lòng xác minh thông qua email',
      email_exists: 'Email đã tồn tại',
      username_exists: 'Username đã tồn tại',
      password_mismatch: 'Mật khẩu không khớp',
      mail_throttled:
        'Chờ 60 giây trước khi yêu cầu gửi email đăng ký tiếp theo',
      mail_failed:
        'Không thể gửi email xác minh, vui lòng kiểm tra lại địa chỉ email',
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
      mail_failed:
        'Không thể gửi email xác minh, vui lòng kiểm tra lại địa chỉ email',
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
      email_not_exists: 'Email không tồn tại',
      mail_failed:
        'Không thể gửi email xác minh, vui lòng kiểm tra lại địa chỉ email',
      success:
        'Yêu cầu đặt lại mật khẩu thành công, vui lòng xác minh thông qua email',
      mail_throttled:
        'Chờ 60 giây trước khi gửi yêu cầu gửi email đặt lại mật khẩu tiếp theo',
    },
    verify_reset_password: {
      invalid_or_expired_code: 'Mã xác minh không hợp lệ hoặc đã hết hạn',
      password_mismatch: 'Mật khẩu không khớp',
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
      mail_failed: 'Không thể gửi email xác minh, vui lòng thử lại',
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
      password_incorrect: 'Mật khẩu không đúng',
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
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để có thể xem trang cá nhân của họ',
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
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem thông tin số lượng theo dõi',
    },
    get_follower_list: {
      user_not_found: 'Người dùng không tồn tại',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem danh sách người theo dõi',
      success: 'Lấy danh sách người theo dõi thành công',
      no_content: 'Không có người theo dõi hoặc đã hết danh sách',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_following_list: {
      user_not_found: 'Người dùng không tồn tại',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem danh sách theo dõi',
      no_content: 'Không có đang theo dõi hoặc đã hết danh sách',
      success: 'Lấy danh sách đang theo dõi thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    post_follow: {
      followee_blocked: 'Không thể theo dõi do bạn đã chặn người dùng này',
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
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem trạng thái theo dõi',
      can_not_self_check: 'Yêu cầu không hợp lệ',
      sucess: 'Lấy trạng thái theo dõi thành công',
    },
  },
  friendship: {
    send_request: {
      recipient_blocked:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để gửi lời mời',
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
      friendship_exists: 'Bạn và người dùng này đã là bạn bè trước đó',
    },
    reject_request: {
      success: 'Từ chối kết bạn thành công',
      request_not_found: 'Không tìm thấy lời mời kết bạn',
      friendship_exists: 'Bạn và người dùng này đã là bạn bè trước đó',
    },
    cancel_request: {
      success: 'Hủy lời mời kết bạn thành công',
      request_not_found: 'Không tìm thấy lời mời kết bạn',
      friendship_exists: 'Bạn và người dùng này đã là bạn bè trước đó',
    },
    get_friend_list: {
      success: 'Lấy danh sách bạn bè thành công',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_user_friend_list: {
      success: 'Lấy danh sách bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem danh sách bạn bè',
      cursor_invalid: 'Con trỏ không hợp lệ',
    },
    get_mutual_friend_list: {
      success: 'Lấy danh sách bạn bè chung thành công',
      user_not_found: 'Không tìm thấy người dùng',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem danh sách bạn bè chung',
      cursor_invalid: 'Con trỏ không hợp lệ',
      cant_self_get: 'Lấy danh sách bạn chung không hợp lệ',
    },
    get_friend_count: {
      success: 'Lấy số lượng bạn bè thành công',
    },
    get_user_friend_count: {
      success: 'Lấy số lượng bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem số lượng bạn bè',
    },
    get_friend_status: {
      success: 'Lấy trạng thái bạn bè thành công',
      user_not_found: 'Không tìm thấy người dùng',
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem trạng thái bạn bè',
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
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem số lượng bạn bè chung',
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
      target_user_block:
        'Bạn đã chặn người dùng này, hãy gỡ chặn để xem danh sách hoạt động',
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
    pin_content: {
      not_found: 'Không tìm thấy bài viết của bạn',
      already_pinned: 'Bài viết đã được ghim trước đó',
      success: 'Ghim bài viết thành công',
    },
    unpin_content: {
      not_found: 'Không tìm thấy bài viết của bạn',
      already_unpinned: 'Bài viết chưa được ghim',
      success: 'Bỏ ghim bài viết thành công',
    },
    create_post: {
      user_not_found: 'Không tìm thấy người dùng',
      success: 'Đăng tải bài viết thành công',
      text_or_media_required:
        'Bài viết phải có nội dung văn bản hoặc ít nhất 1 tệp media',
      media_files_number_invalid:
        'Số lượng tệp media không hợp lệ khi tạo bài viết có media',
      media_content_types_required:
        'Cần khai báo content type cho từng media file',
      media_content_types_count_mismatch:
        'Số lượng content type media phải khớp mediaFilesNumber',
      gen_media_presigned_url_failed:
        'Không thể tạo URL upload media, vui lòng thử lại',
      upload_failed: 'Quá trình tải tệp lên thất bại, vui lòng thử lại.',
      invalid_media_key: 'Media key không hợp lệ',
      invalid_media_content_type: 'Media content type không hợp lệ',
      media_file_too_large: 'Mỗi media file tối đa 500MB',
      confirm_content_not_found:
        'Không tìm thấy bài viết để xác nhận tải tệp media.',
      confirm_media_failed:
        'Không thể xác nhận media cho bài viết, vui lòng thử lại.',
      confirm_media_success: 'Xác nhận upload media thành công',
    },
    delete_content: {
      user_not_found: 'Không tìm thấy người dùng',
      not_found: 'Không tìm thấy bài viết của bạn',
      success: 'Xóa bài thành công',
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
    update_content: {
      not_found: 'Không tìm thấy bài viết của bạn',
      success: 'Chỉnh sủa bài viết thành công',
    },
    get_content: {
      success: 'Lấy chi tiết bài viết thành công',
      not_found: 'Không tìm thấy bài viết',
    },
    get_feed: {
      success: 'Lấy bảng tin thành công',
      no_content: 'Đã hết bài đăng',
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
      user_not_found: 'Không tìm thấy người dùng',
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
    update_comment: {
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
  },
  common: {
    too_many_requests: 'Thao tác quá nhanh, vui lòng thử lại sau.',
    session_revoked: 'Phiên đã hết hạn, vui lòng đăng nhập lại',
    token_not_found: 'Không tìm thấy mã xác minh',
    account_not_activate:
      'Tài khoản của bạn đang không được kích hoạt! Vui lòng liên hệ với quản trị viên để biết lý do',
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
