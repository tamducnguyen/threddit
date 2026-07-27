import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChunkPayload } from './interfaces/rag.interface';
import { GEMINI_BASE, withGeminiRetry } from './gemini.helper';
import {
  ABSTAIN_SENTINEL,
  INJECTION_GUARD_RULE,
  sanitizeForPrompt,
  sanitizeTopic,
  wrapUntrustedData,
} from './prompt.helper';

const EMPTY_FALLBACK = 'No relevant content was found for this topic.';

/** Matches inline source citations like `[1]`, `[12]`. */
const CITATION_RE = /\[(\d+)\]/g;

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

@Injectable()
export class SummarizerService {
  private readonly logger = new Logger(SummarizerService.name);

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
   * Summarize the retrieved chunks for `topic`, grounded by inline citations.
   *
   * Anti-hallucination guards:
   *  - Chunks are labelled `[1..N]` and the model must cite the source label
   *    after each claim; we then verify every cited label is in range.
   *  - The model is told to return {@link ABSTAIN_SENTINEL} when the topic is
   *    not discussed — we map that (and any answer that cites no valid source)
   *    to {@link EMPTY_FALLBACK} rather than surfacing ungrounded text.
   *  - Citation markers are stripped from the final user-facing summary.
   */
  async summarize(topic: string, chunks: ChunkPayload[]): Promise<string> {
    if (chunks.length === 0) return EMPTY_FALLBACK;

    // Label each chunk so the model can cite it by a short, echo-friendly index
    // (UUID chunkIds are too long for the model to reproduce reliably).
    const labelled = chunks
      .map((chunk, i) => `[${i + 1}] ${sanitizeForPrompt(chunk.text)}`)
      .join('\n\n');
    const prompt = this.buildPrompt(sanitizeTopic(topic), labelled);

    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    const url = `${GEMINI_BASE}/models/${this.model()}:generateContent?key=${apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    return await withGeminiRetry(async () => {
      const { data } = await firstValueFrom(
        this.httpService.post<GenerateContentResponse>(url, body),
      );
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      return this.verifyAndClean(raw, chunks.length);
    });
  }

  /**
   * Enforce grounding on the model's raw answer: abstain on the sentinel or
   * when nothing valid is cited, otherwise strip the citation markers and
   * return the cleaned summary.
   */
  private verifyAndClean(raw: string, chunkCount: number): string {
    if (raw.length === 0 || raw.includes(ABSTAIN_SENTINEL)) {
      return EMPTY_FALLBACK;
    }

    let validCitations = 0;
    let invalidCitations = 0;
    for (const match of raw.matchAll(CITATION_RE)) {
      const index = Number(match[1]);
      if (index >= 1 && index <= chunkCount) {
        validCitations += 1;
      } else {
        invalidCitations += 1;
      }
    }

    // A non-abstaining summary that cites no real source is ungrounded — treat
    // it as a hallucination and abstain instead of surfacing it.
    if (validCitations === 0) {
      this.logger.warn(
        `Summary discarded: no valid citation among ${chunkCount} chunks`,
      );
      return EMPTY_FALLBACK;
    }
    if (invalidCitations > 0) {
      this.logger.warn(
        `Summary cited ${invalidCitations} out-of-range source(s); markers stripped`,
      );
    }

    // Remove citation markers and tidy the whitespace they leave behind.
    const cleaned = raw
      .replace(CITATION_RE, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +([.,;:!?])/g, '$1')
      .trim();

    return cleaned.length > 0 ? cleaned : EMPTY_FALLBACK;
  }

  private buildPrompt(topic: string, labelledChunkTexts: string): string {
    return [
      `You are a conversation summarization assistant. Below are group-chat excerpts related to the topic "${topic}", each labelled with a source tag of the form [number]:`,
      '',
      wrapUntrustedData(labelledChunkTexts),
      '',
      `Write a concise, coherent summary of the main content related to the topic "${topic}".`,
      'Mandatory rules:',
      INJECTION_GUARD_RULE,
      '- Summarize only what appears in the excerpts above; never add outside information.',
      '- After each claim, append the corresponding source tag [number] (e.g. "The team agreed to meet on Friday [2].").',
      `- If the excerpts do NOT discuss the topic "${topic}", return exactly one line: ${ABSTAIN_SENTINEL}`,
    ].join('\n');
  }
}
