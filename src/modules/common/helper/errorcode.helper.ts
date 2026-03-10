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
      target_user_block: '132',
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
    upload_failed: '155',
    invalid_upload_session_id: '156',
    media_file_too_large: '157',
    invalid_media_content_type: '158',
    content_not_found: '196',
    invalid_media_file_number: '198',
    story_must_have_one_media: '199',
    invalid_content_type: '48',
    invalid_key: '62',
    object_not_found: '63',
    invalid_media_key: '154',
  },
  common: {
    token_not_found: '50',
    session_revoked: '51',
    account_not_activate: '52',
    too_many_requests: '53',
  },
  http: {
    check_toxic: {
      toxic: '188',
    },
    common: {
      time_out: '189',
    },
  },
  follow: {
    get_follow_number: {
      user_not_found: '64',
      target_user_block: '75',
    },
    get_follower_list: {
      user_not_found: '65',
      target_user_block: '76',
      cursor_invalid: '66',
    },
    get_following_list: {
      user_not_found: '67',
      target_user_block: '77',
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
      target_user_block: '78',
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
      target_user_block: '133',
      cursor_invalid: '107',
    },
    get_mutual_friend_list: {
      user_not_found: '108',
      target_user_block: '134',
      cursor_invalid: '109',
      cant_self_get: '120',
    },
    get_friend_count: {
      success: '110',
    },
    get_user_friend_count: {
      user_not_found: '111',
      target_user_block: '135',
    },
    get_friend_status: {
      user_not_found: '115',
      target_user_block: '136',
      cant_self_check: '116',
    },
    unfriend: {
      user_not_found: '117',
      friend_not_found: '118',
      cant_self_unfriend: '119',
    },
    get_mutual_friend_count: {
      user_not_found: '112',
      target_user_block: '137',
      cant_self_get: '121',
    },
    get_sent_request_count: {
      success: '113',
    },
    get_received_request_count: {
      success: '114',
    },
  },
  content: {
    get_timeline_content: {
      user_not_found: '138',
      cursor_invalid: '139',
      target_user_block: '140',
    },
    get_saved_content: {
      cursor_invalid: '141',
    },

    save_content: {
      user_not_found: '159',
      not_found: '160',
      already: '161',
    },
    unsave_content: {
      user_not_found: '162',
      not_found: '163',
      not_save: '164',
    },
    reaction_content: {
      user_not_found: '165',
      not_found: '166',
      already: '167',
    },
    update_reaction_content: {
      user_not_found: '168',
      not_found: '169',
      not_reacted: '170',
      already: '171',
    },
    delete_reaction_content: {
      user_not_found: '172',
      not_found: '173',
      not_reacted: '174',
    },
    share_content: {
      user_not_found: '175',
      not_found: '176',
      target_user_block: '177',
      already: '178',
    },
    update_share_content: {
      user_not_found: '179',
      not_found: '180',
      target_user_block: '181',
      no_field_to_update: '182',
      not_share: '183',
    },
    unshare_content: {
      user_not_found: '184',
      not_found: '185',
      target_user_block: '186',
      not_share: '187',
    },
    comment: {
      content_not_found: '211',
      parent_comment_not_found: '217',
      user_not_found: '212',
      target_user_block: '213',
      parent_commenter_block: '220',
      text_or_media_required: '214',
      only_one_media_allowed: '215',
      confirm_media_failed: '216',
    },
    delete_comment: {
      not_found: '218',
    },
    get_comment: {
      content_not_found: '222',
      target_user_block: '223',
      cursor_invalid: '224',
    },
    get_detail_comment: {
      not_found: '219',
      target_user_block: '221',
    },
    get_child_comments: {
      not_found: '232',
    },
    update_comment: {
      not_found: '225',
      target_user_block: '226',
      parent_commenter_block: '227',
      no_field_to_update: '228',
      text_or_media_required: '229',
      only_one_media_allowed: '230',
      confirm_media_failed: '231',
    },
    create_post: {
      user_not_found: '142',
      text_or_media_required: '143',
      story_must_have_one_media: '144',
      confirm_media_failed: '145',
    },
    update_content: {
      not_found: '200',
      no_field_to_update: '201',
      text_or_media_required: '202',
      story_must_have_one_media: '203',
      invalid_media_key: '204',
    },
    get_friend_story: {
      cursor_invalid: '146',
    },
    get_my_story: {
      cursor_invalid: '206',
    },
    get_my_current_story: {
      cursor_invalid: '205',
    },
    get_other_current_story: {
      user_not_found: '207',
      cursor_invalid: '208',
      target_user_block: '209',
    },
    get_pinned_story: {
      user_not_found: '191',
      cursor_invalid: '190',
      target_user_block: '192',
    },
    get_content: {
      not_found: '147',
    },
    pin_content: {
      not_found: '148',
      already_pinned: '149',
      only_one_post_allowed: '150',
    },
    unpin_content: {
      not_found: '151',
      already_unpinned: '152',
    },
    delete_content: {
      not_found: '153',
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
