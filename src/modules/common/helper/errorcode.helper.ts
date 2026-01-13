export const errorCode = {
  auth: {
    signup: {
      too_many_attempts: '01',
      mail_throttled: '02',
      password_mismatch: '03',
      email_exists: '04',
      username_exists: '05',
      mail_failed: '06',
    },
    verify: {
      too_many_attempts: '07',
      invalid_or_expired_code: '08',
      already_verified: '09',
    },
    resend_verification_code: {
      too_many_attempts: '10',
      mail_throttled: '11',
      email_not_exists: '12',
      already_verified: '13',
      mail_failed: '14',
    },
    signin: {
      credential_incorrect: '15',
      account_not_activate: '16',
    },
    reset_password: {
      too_many_attempts: '17',
      mail_throttled: '18',
      email_not_exists: '19',
      mail_failed: '20',
    },
    verify_reset_password: {
      too_many_attempts: '21',
      password_mismatch: '22',
      email_not_exists: '23',
      invalid_or_expired_code: '24',
    },
  },
  account: {
    update_password: {
      user_not_found: '30',
      not_support_this_auth_method: '31',
      passport_same: '32',
      password_mismatch: '33',
      password_incorrect: '34',
    },
    update_username: {
      user_not_found: '35',
      username_duplicate: '36',
      username_exist: '37',
    },
    get_user_info: {
      user_not_found: '38',
    },
    delete_account: {
      user_not_found: '39',
      too_many_attempts: '40',
      mail_throttled: '41',
      mail_failed: '42',
      invalid_or_expired_code: '43',
    },
  },
  profile: {
    get_profile: {
      user_not_found: '44',
    },
    update_profile: {
      no_field_to_update: '47',
      user_not_found: '45',
      username_exist: '46',
    },
    update_avatar: {
      invalid_key: '54',
      upload_not_found: '55',
      invalid_size: '56',
      upload_too_large: '57',
    },
    update_background: {
      invalid_key: '58',
      upload_not_found: '59',
      invalid_size: '60',
      upload_too_large: '61',
    },
  },
  storage: {
    invalid_content_type: '48',
    invalid_key: '62',
    object_not_found: '63',
  },
  common: {
    token_not_found: '50',
    session_revoked: '51',
    account_not_activate: '52',
    too_many_requests: '53',
  },
  follow: {
    get_follow_number: {
      user_not_found: '64',
    },
    get_follower_list: {
      user_not_found: '65',
      cursor_invalid: '66',
    },
    get_following_list: {
      user_not_found: '67',
      cursor_invalid: '68',
    },
    post_follow: {
      followee_blocked: '89',
      cant_self_follow: '69',
      user_not_found: '70',
      follow_already: '71',
    },
    delete_follow: {
      user_not_found: '72',
      follow_not_found: '73',
    },
    get_follow_state: {
      user_not_found: '74',
    },
  },
  friendship: {
    send_request: {
      recipient_blocked: '100',
      cant_self_request: '90',
      user_not_found: '91',
      friendship_exists: '92',
      request_already_sent: '93',
    },
    get_received_requests: {
      cursor_invalid: '94',
    },
    get_sent_requests: {
      cursor_invalid: '95',
    },
    accept_request: {
      user_not_found: '96',
      request_not_found: '97',
      cant_accept_self: '98',
      friendship_exists: '99',
    },
    reject_request: {
      request_not_found: '101',
      friendship_exists: '102',
    },
    cancel_request: {
      request_not_found: '103',
      friendship_exists: '104',
    },
    get_friend_list: {
      cursor_invalid: '105',
    },
    get_user_friend_list: {
      user_not_found: '106',
      cursor_invalid: '107',
    },
    get_mutual_friend_list: {
      user_not_found: '108',
      cursor_invalid: '109',
      cant_self_get: '120',
    },
    get_friend_count: {
      success: '110',
    },
    get_user_friend_count: {
      user_not_found: '111',
    },
    get_friend_status: {
      user_not_found: '115',
      cant_self_check: '116',
    },
    unfriend: {
      user_not_found: '117',
      friend_not_found: '118',
      cant_self_unfriend: '119',
    },
    get_mutual_friend_count: {
      user_not_found: '112',
      cant_self_get: '121',
    },
    get_sent_request_count: {
      success: '113',
    },
    get_received_request_count: {
      success: '114',
    },
  },
  block: {
    post_block: {
      user_not_found: '122',
      cant_self_block: '123',
      already_blocked: '124',
    },
    delete_block: {
      user_not_found: '125',
      cant_self_unblock: '126',
      not_blocked: '127',
    },
    get_blocked_list: {
      user_not_found: '128',
      cursor_invalid: '129',
    },
    get_block_status: {
      user_not_found: '130',
      cant_self_check: '131',
    },
  },
  notification: {
    create_stream: {
      user_not_found: '81',
    },
    get_notification: {
      user_not_found: '82',
      cursor_invalid: '83',
    },
    get_unread_notification: {
      user_not_found: '84',
      cursor_invalid: '85',
    },
    read_notification: {
      not_found_or_already_read: '86',
    },
    delete_notification: {
      not_found: '87',
    },
    get_count_unread: {
      user_not_found: '88',
    },
  },
};
