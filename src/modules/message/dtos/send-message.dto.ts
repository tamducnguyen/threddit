import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SendMessageDTO {
  // Optional: present only when sending into an already existing conversation.
  // Mutually exclusive with `username` (enforced in the gateway).
  @IsOptional()
  @IsInt({ message: 'Id cuộc trò chuyện phải là số nguyên' })
  @Min(1, { message: 'Id cuộc trò chuyện không hợp lệ' })
  conversationId?: number;

  @IsOptional()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi' })
  @MaxLength(2000, {
    message: 'Nội dung tin nhắn không được vượt quá 2000 ký tự',
  })
  text?: string;

  @IsOptional()
  @IsString({ message: 'uploadSessionId phải là chuỗi' })
  uploadSessionId?: string;

  @IsOptional()
  @IsInt({ message: 'Id tin nhắn trả lời phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn trả lời không hợp lệ' })
  replyToMessageId?: number;

  // Optional: present only when starting/continuing a direct chat by username.
  // Mutually exclusive with `conversationId` (enforced in the gateway).
  @IsOptional()
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Matches(/^(?=.{1,30}$)(?![_.])[a-z0-9]+(?:[._][a-z0-9]+)*$/, {
    message:
      'username chỉ cho phép a-z, 0-9, "." và "_"; không dấu; không khoảng trắng; không bắt đầu/kết thúc bằng "." hoặc "_"; không có ký tự đặc biệt liên tiếp; độ dài 1–30',
  })
  username?: string;

  // Usernames mentioned in the message text. Only usernames that are current
  // members of the target conversation actually get mentioned/notified —
  // others are silently dropped (see MessageService.sendMessage).
  @IsOptional()
  @IsArray({ message: 'Danh sách người dùng được đề cập phải là một mảng' })
  @ArrayMaxSize(10, {
    message: 'Danh sách người dùng được đề cập chỉ tối đa 10 phần tử',
  })
  @ArrayUnique({
    message: 'Mỗi username được đề cập chỉ được xuất hiện một lần',
  })
  @IsString({ each: true, message: 'Mỗi username được đề cập phải là chuỗi' })
  mentionedUsers?: string[];
}
