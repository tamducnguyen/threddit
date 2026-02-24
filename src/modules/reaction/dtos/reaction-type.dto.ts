import { IsEnum } from 'class-validator';
import { ReactionType } from 'src/modules/enum/reactiontype.enum';

export class ReactionTypeDTO {
  @IsEnum(ReactionType, { message: 'Loại cảm xúc không hợp lệ' })
  type: ReactionType;
}
