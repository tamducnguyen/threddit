import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CleanMessage } from './interfaces/rag.interface';
import { GEMINI_BASE, withGeminiRetry } from './gemini.helper';
import {
  INJECTION_GUARD_RULE,
  sanitizeForPrompt,
  wrapUntrustedData,
} from './prompt.helper';

const MAX_TOPICS = 8;
const MAX_MESSAGES_FOR_DETECTION = 200;
const MAX_CHARS = 6000;

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

@Injectable()
export class TopicDetectorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private model(): string {
    return (
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'
    );
  }

  /**
   * Ask Gemini Flash to identify up to MAX_TOPICS discussion topics from the
   * conversation. Returns an empty array when nothing can be parsed.
   */
  async detectTopics(messages: CleanMessage[]): Promise<string[]> {
    if (messages.length === 0) return [];

    const joined = this.buildContext(messages);
    const prompt = this.buildPrompt(joined);

    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    const url = `${GEMINI_BASE}/models/${this.model()}:generateContent?key=${apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    return await withGeminiRetry(async () => {
      const { data } = await firstValueFrom(
        this.httpService.post<GenerateContentResponse>(url, body),
      );
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      return this.parseTopics(raw);
    });
  }

  private buildContext(messages: CleanMessage[]): string {
    // Take the most recent messages first, then truncate to MAX_CHARS.
    const recent = messages.slice(-MAX_MESSAGES_FOR_DETECTION);
    let result = '';
    for (const m of recent) {
      const line = sanitizeForPrompt(`${m.sender}: ${m.text}`) + '\n';
      if (result.length + line.length > MAX_CHARS) break;
      result += line;
    }
    return result;
  }

  private buildPrompt(joinedMessages: string): string {
    return [
      'Bạn là trợ lý phân tích hội thoại. Dưới đây là một đoạn trích từ group chat:',
      '',
      wrapUntrustedData(joinedMessages),
      '',
      `Hãy liệt kê tối đa ${MAX_TOPICS} chủ đề chính được thảo luận trong đoạn trích này.`,
      'Trả về kết quả dưới dạng mảng JSON gồm các chuỗi ngắn (3-8 từ mỗi chủ đề), ví dụ:',
      '["tiến độ dự án", "phân công công việc", "ngân sách"]',
      'Viết các chủ đề bằng tiếng Việt.',
      INJECTION_GUARD_RULE,
      'Chỉ trả về mảng JSON, không kèm bất kỳ giải thích nào khác.',
    ].join('\n');
  }

  private parseTopics(raw: string): string[] {
    try {
      // Strip markdown fences if Gemini wraps the JSON.
      const cleaned = raw
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
      const parsed: unknown = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (t): t is string => typeof t === 'string' && t.trim().length > 0,
        )
        .map((t) => t.trim())
        .slice(0, MAX_TOPICS);
    } catch {
      return [];
    }
  }
}
