import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Chunk, ChunkWithVector } from './interfaces/rag.interface';
import { GEMINI_BASE, withGeminiRetry } from './gemini.helper';

// Must match the Qdrant collection size (qdrant.service.ts VECTOR_SIZE).
// gemini-embedding-* default to 3072 but accept outputDimensionality.
const EMBEDDING_DIM = 768;

interface EmbedContentResponse {
  embedding: { values: number[] };
}
interface BatchEmbedResponse {
  embeddings: Array<{ values: number[] }>;
}

@Injectable()
export class EmbedderService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private model(): string {
    return (
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ??
      'gemini-embedding-2'
    );
  }

  private apiKey(): string {
    return this.configService.getOrThrow<string>('GEMINI_API_KEY');
  }

  /** Embed every chunk's `text` in one batch call, attaching `vector`. */
  async embedChunks(chunks: Chunk[]): Promise<ChunkWithVector[]> {
    if (chunks.length === 0) return [];
    const model = this.model();
    const url = `${GEMINI_BASE}/models/${model}:batchEmbedContents?key=${this.apiKey()}`;
    const body = {
      requests: chunks.map((chunk) => ({
        model: `models/${model}`,
        content: { parts: [{ text: chunk.text }] },
        outputDimensionality: EMBEDDING_DIM,
      })),
    };

    return await withGeminiRetry(async () => {
      const { data } = await firstValueFrom(
        this.httpService.post<BatchEmbedResponse>(url, body),
      );
      return chunks.map((chunk, index) => ({
        ...chunk,
        vector: data.embeddings[index]?.values ?? [],
      }));
    });
  }

  /** Batch-embed an array of plain texts (used for per-message semantic boundary detection). */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const model = this.model();
    const url = `${GEMINI_BASE}/models/${model}:batchEmbedContents?key=${this.apiKey()}`;
    const body = {
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIM,
      })),
    };

    return await withGeminiRetry(async () => {
      const { data } = await firstValueFrom(
        this.httpService.post<BatchEmbedResponse>(url, body),
      );
      return data.embeddings.map((e) => e.values ?? []);
    });
  }

  /** Embed a single query string. */
  async embedQuery(query: string): Promise<number[]> {
    const model = this.model();
    const url = `${GEMINI_BASE}/models/${model}:embedContent?key=${this.apiKey()}`;
    const body = {
      model: `models/${model}`,
      content: { parts: [{ text: query }] },
      outputDimensionality: EMBEDDING_DIM,
    };

    return await withGeminiRetry(async () => {
      const { data } = await firstValueFrom(
        this.httpService.post<EmbedContentResponse>(url, body),
      );
      return data.embedding.values;
    });
  }
}
