import { IsEnum } from 'class-validator';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';

export class ChangeMemberRoleDTO {
  @IsEnum(ConversationMemberRole, { message: 'Vai trò không hợp lệ' })
  role: ConversationMemberRole;
}
