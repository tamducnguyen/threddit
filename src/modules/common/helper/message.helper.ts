export const message = {
  auth: {
    signup: {
      success: 'Đăng ký thành công, vui lòng xác minh thông qua email',
      email_exists: 'Email đã tồn tại',
      username_exists: 'Tên người dùng đã tồn tại',
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
    signin: {
      credential_incorrect: 'Email hoặc mật khẩu không đúng, vui lòng thử lại',
      success: 'Đăng nhập thành công',
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
      id_token_missing: 'Google không trả về id_token',
      invalid_token: 'Mã xác minh Google không hợp lệ',
      email_not_verified: 'Email không được xác minh bởi Google',
    },
    google_signup: {
      email_exists: 'Email đã tồn tại',
      username_exists: 'Tên người dùng đã tồn tại',
      success: 'Đăng ký thành công',
    },
    google_signin: {
      account_not_exists: 'Tài khoản chưa được đăng ký',
      success: 'Đăng nhập thành công',
    },
  },
  account: {
    signout: {
      success: 'Đăng xuất thành công',
    },
    update_password: {
      passport_same: 'Mật khẩu mới không được giống với mật khẩu cũ',
      password_mismatch: 'Mật khẩu không khớp',
      user_not_found: 'Người dùng không tồn tại',
      password_incorrect: 'Mật khẩu không đúng',
      success: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại để tiếp tục',
    },
    update_username: {
      username_exist:
        'Tên người dùng đã tồn tại, vui lòng chọn lại tên người dùng khác',
      success: 'Đổi tên người dùng thành công',
    },
    get_user_info: {
      user_not_found: 'Người dùng không tồn tại',
      success: 'Lấy thông tin người dùng thành công',
    },
  },
  common: {
    too_many_requests: 'Thao tác quá nhanh, vui lòng thử lại sau.',
    session_revoked: 'Phiên đã hết hạn, vui lòng đăng nhập lại',
    token_not_found: 'Không tìm thấy mã xác minh',
  },
};
