import { Injectable } from '@nestjs/common';
import { CleanMessage, RagSourceMessage } from './interfaces/rag.interface';

// Matches messages made up entirely of emoji + whitespace, which carry no
// summarizable content.
const EMOJI_ONLY = /^[\u{1F000}-\u{1FFFF}\s]+$/u;

@Injectable()
export class PreprocessorService {
  /**
   * Clean a conversation's raw messages into RAG-ready form:
   * - drop revoked messages and ones with no text (e.g. media-only),
   * - normalize text (trim + collapse internal whitespace),
   * - drop emoji-only messages.
   */
  preprocess(messages: RagSourceMessage[]): CleanMessage[] {
    const clean: CleanMessage[] = [];
    for (const raw of messages) {
      if (raw.isRevoked) continue;
      if (raw.text == null) continue;

      const text = raw.text.replace(/\s+/g, ' ').trim();
      if (text.length === 0) continue;
      if (EMOJI_ONLY.test(text)) continue;

      clean.push({
        sender: raw.sender,
        text,
        timestamp:
          raw.createdAt instanceof Date
            ? raw.createdAt.toISOString()
            : new Date(raw.createdAt).toISOString(),
      });
    }
    return clean;
  }
}
