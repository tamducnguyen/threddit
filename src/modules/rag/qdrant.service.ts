import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChunkPayload } from './interfaces/rag.interface';

const VECTOR_SIZE = 768;
const DISTANCE = 'Cosine';

interface QdrantPoint {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}
interface QdrantSearchResponse {
  result: Array<{ id: string; score: number; payload: ChunkPayload }>;
}

/**
 * Thin Qdrant REST client (avoids adding the official SDK as a dependency).
 * The collection is created lazily so the app can boot without Qdrant
 * configured; it's ensured right before the first upsert.
 */
@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private collectionEnsured = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private baseUrl(): string {
    return this.configService
      .getOrThrow<string>('QDRANT_URL')
      .replace(/\/$/, '');
  }

  private collection(): string {
    return this.configService.get<string>('QDRANT_COLLECTION') ?? 'chat_chunks';
  }

  /** Create the collection (size 768, Cosine) once if it doesn't already exist. */
  async ensureCollection(): Promise<void> {
    if (this.collectionEnsured) return;
    const url = `${this.baseUrl()}/collections/${this.collection()}`;
    try {
      await firstValueFrom(this.httpService.get(url));
      this.collectionEnsured = true;
      return;
    } catch {
      // Not found (or unreachable) — attempt to create it.
    }
    await firstValueFrom(
      this.httpService.put(url, {
        vectors: { size: VECTOR_SIZE, distance: DISTANCE },
      }),
    );
    this.collectionEnsured = true;
    this.logger.log(`Created Qdrant collection "${this.collection()}"`);
  }

  /** Upsert chunk points (id = chunkId UUID, payload carries conversationId). */
  async upsert(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) return;
    await this.ensureCollection();
    const url = `${this.baseUrl()}/collections/${this.collection()}/points?wait=true`;
    await firstValueFrom(this.httpService.put(url, { points }));
  }

  /**
   * Delete every chunk belonging to a conversation. Chunk ids are random UUIDs
   * regenerated on each indexing pass, so callers that re-index a conversation
   * must clear the old points first or the collection accumulates stale chunks.
   */
  async deleteByConversation(conversationId: number): Promise<void> {
    await this.ensureCollection();
    const url = `${this.baseUrl()}/collections/${this.collection()}/points/delete?wait=true`;
    await firstValueFrom(
      this.httpService.post(url, {
        filter: {
          must: [{ key: 'conversationId', match: { value: conversationId } }],
        },
      }),
    );
  }

  /**
   * Vector search filtered to a single conversation; returns the chunk payloads.
   * When `scoreThreshold` is given, Qdrant drops hits below that cosine score so
   * clearly-irrelevant chunks never reach the summarizer (relevance gate).
   */
  async search(
    vector: number[],
    conversationId: number,
    topK: number,
    scoreThreshold?: number,
  ): Promise<ChunkPayload[]> {
    const url = `${this.baseUrl()}/collections/${this.collection()}/points/search`;
    const body = {
      vector,
      limit: topK,
      with_payload: true,
      filter: {
        must: [{ key: 'conversationId', match: { value: conversationId } }],
      },
      ...(scoreThreshold !== undefined
        ? { score_threshold: scoreThreshold }
        : {}),
    };
    const { data } = await firstValueFrom(
      this.httpService.post<QdrantSearchResponse>(url, body),
    );
    return data.result.map((hit) => hit.payload);
  }
}
