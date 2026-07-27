import { IsEnum, IsInt, Min } from 'class-validator';
import { ReactionType } from 'src/enum/reactiontype.enum';

export class ReactMessageDTO {
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  messageId: number;

  @IsEnum(ReactionType, { message: 'Loại cảm xúc không hợp lệ' })
  type: ReactionType;
}
