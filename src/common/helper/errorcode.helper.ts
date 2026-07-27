export const errorCode = {
  auth: {
    signup: {
      too_many_attempts: '01',
      mail_throttled: '02',
      email_exists: '04',
      username_exists: '05',
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
    },
    signin: {
      credential_incorrect: '15',
      account_not_activate: '16',
    },
    reset_password: {
      too_many_attempts: '17',
      mail_throttled: '18',
    },
    verify_reset_password: {
      too_many_attempts: '21',
      email_not_exists: '23',
      invalid_or_expired_code: '24',
    },
    google_auth: {
      id_token_missing: '25',
      invalid_token: '26',
      email_not_verified: '27',
      already_auth_method: '28',
      account_not_activate: '29',
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
      invalid_or_expired_code: '43',
    },
  },
  profile: {
    get_profile: {
      user_not_found: '44',
    },
    search_profile: {
      cursor_invalid: '249',
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
    blocked_or_not_found: '251',
    self_blocked_target: '252',
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
    },
    reject_request: {
      request_not_found: '101',
    },
    cancel_request: {
      request_not_found: '103',
    },
    get_friend_list: {
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
  content: {
    get_timeline_content: {
      user_not_found: '138',
      cursor_invalid: '139',
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
    reaction_comment: {
      user_not_found: '233',
      not_found: '234',
      already: '235',
    },
    update_reaction_comment: {
      user_not_found: '236',
      not_found: '237',
      not_reacted: '238',
      already: '239',
    },
    delete_reaction_comment: {
      user_not_found: '240',
      not_found: '241',
      not_reacted: '242',
    },
    share_content: {
      user_not_found: '175',
      not_found: '176',
      already: '178',
    },
    update_share_content: {
      user_not_found: '179',
      not_found: '180',
      no_field_to_update: '182',
      not_share: '183',
    },
    unshare_content: {
      user_not_found: '184',
      not_found: '185',
      not_share: '187',
    },
    comment: {
      content_not_found: '211',
      parent_comment_not_found: '217',
      user_not_found: '212',
      text_or_media_required: '214',
      only_one_media_allowed: '215',
      confirm_media_failed: '216',
    },
    delete_comment: {
      not_found: '218',
    },
    get_comment: {
      content_not_found: '222',
      cursor_invalid: '224',
    },
    get_detail_comment: {
      not_found: '219',
    },
    get_child_comments: {
      not_found: '232',
    },
    update_comment: {
      not_found: '225',
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
    },
    get_pinned_story: {
      user_not_found: '191',
      cursor_invalid: '190',
    },
    get_content: {
      not_found: '147',
    },
    get_content_by_key: {
      cursor_invalid: '250',
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
  chat: {
    send_message: {
      invalid_target: '251',
      conversation_not_found: '252',
      not_a_member: '253',
      cant_message_self: '254',
      text_or_media_required: '255',
      user_not_found: '256',
    },
    get_messages: {
      conversation_not_found: '257',
      not_a_member: '258',
      cursor_invalid: '259',
    },
    list_conversations: {
      cursor_invalid: '260',
    },
    revoke_message: {
      not_found: '261',
      forbidden: '262',
    },
    react_message: {
      not_found: '263',
      already: '264',
      not_reacted: '265',
      not_a_member: '266',
    },
    create_group: {
      min_member_required: '267',
      user_not_found: '268',
    },
    member: {
      conversation_not_found: '269',
      not_a_group: '270',
      user_not_found: '271',
      forbidden: '272',
      not_a_member: '273',
      already_member: '274',
      target_not_a_member: '275',
      cannot_demote_last_admin: '288',
    },
    summarize: {
      conversation_not_found: '278',
      not_a_member: '279',
    },
    topics: {
      conversation_not_found: '282',
      not_a_member: '283',
    },
    pin: {
      conversation_not_found: '280',
      not_a_member: '281',
      pin_limit_exceeded: '282',
    },
    mark_read: {
      conversation_not_found: '286',
    },
    edit_message: {
      not_found: '290',
      forbidden: '291',
      revoked: '292',
      text_required: '293',
    },
    pin_message: {
      not_found: '294',
      forbidden: '295',
      limit_exceeded: '296',
      not_a_member: '297',
    },
    search_messages: {
      conversation_not_found: '298',
      cursor_invalid: '299',
    },
    rate_limit: {
      send_message: '300',
      typing: '301',
    },
    error: {
      internal: '287',
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
