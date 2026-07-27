import { ReactionType } from 'src/enum/reactiontype.enum';

export interface ReactionCount {
  type: ReactionType;
  count: number;
}
