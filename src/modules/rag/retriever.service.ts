import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbedderService } from './embedder.service';
import { QdrantService } from './qdrant.service';
import { ChunkPayload, ChunkWithVector } from './interfaces/rag.interface';

// Reciprocal Rank Fusion constant — 60 is the standard literature default.
const RRF_K = 60;

// Default minimum cosine score for a vector hit to count as relevant. Tuned for
// Gemini embeddings; override with RAG_MIN_SCORE. 0 disables the relevance gate.
const DEFAULT_MIN_VECTOR_SCORE = 0.4;

function rrfScore(rank: number): number {
  return 1 / (RRF_K + rank);
}

/** Tokenisation: lowercase whitespace split (language-agnostic word/syllable level). */
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

interface Bm25Corpus {
  tokenized: string[][];
  avgdl: number;
}

function buildBm25Corpus(corpus: string[]): Bm25Corpus {
  const tokenized = corpus.map(tokenize);
  const N = tokenized.length;
  const avgdl = N === 0 ? 1 : tokenized.reduce((s, d) => s + d.length, 0) / N;
  return { tokenized, avgdl };
}

/** Simple BM25 scorer over a pre-tokenized corpus. */
function bm25Scores(
  queryTokens: string[],
  { tokenized, avgdl }: Bm25Corpus,
  k1 = 1.5,
  b = 0.75,
): number[] {
  const N = tokenized.length;

  // Document frequency only depends on the term, not the document being
  // scored — compute it once per unique query term instead of once per
  // (document, term) pair.
  const dfByTerm = new Map<string, number>();
  for (const term of queryTokens) {
    if (dfByTerm.has(term)) continue;
    dfByTerm.set(term, tokenized.filter((d) => d.includes(term)).length);
  }

  return tokenized.map((docTokens) => {
    let score = 0;
    for (const term of queryTokens) {
      const df = dfByTerm.get(term)!;
      if (df === 0) continue;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const tf = docTokens.filter((t) => t === term).length;
      const dl = docTokens.length;
      const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl)));
      score += idf * tfNorm;
    }
    return score;
  });
}

@Injectable()
export class RetrieverService {
  /**
   * In-memory BM25 index, refreshed on each indexChunks call. Assumes a
   * single service instance — unlike the Qdrant-backed vector half, this
   * cache is not shared across processes. If this service is ever scaled
   * horizontally, a request routed to an instance that didn't perform the
   * indexing will see an empty BM25 corpus and hybrid retrieval will
   * silently degrade to vector-only. Move to a shared store (or Qdrant's
   * own text-match filtering) before running more than one instance.
   */
  private readonly chunkIndex = new Map<number, ChunkPayload[]>();

  /** Pre-tokenized BM25 corpus, kept in sync with chunkIndex. */
  private readonly bm25Corpus = new Map<number, Bm25Corpus>();

  /**
   * Serializes indexChunks calls per conversation so a concurrent re-index
   * (e.g. two overlapping summarize requests) can't interleave
   * its Qdrant delete+upsert with another call's, or clobber the BM25 cache
   * out of order.
   */
  private readonly indexLocks = new Map<number, Promise<void>>();

  /** Minimum cosine score for a vector hit to count as relevant. */
  private readonly minVectorScore: number;

  constructor(
    private readonly embedder: EmbedderService,
    private readonly qdrant: QdrantService,
    private readonly configService: ConfigService,
  ) {
    this.minVectorScore = Number(
      this.configService.get<number>('RAG_MIN_SCORE') ??
        DEFAULT_MIN_VECTOR_SCORE,
    );
  }

  /**
   * Replace a conversation's index with `chunks`: drop the previously indexed
   * chunks (in Qdrant and the in-memory BM25 cache) then index the new set, so
   * retrieval reflects only the current input — never stale, already-processed
   * chunks. Passing an empty `chunks` clears the conversation entirely.
   */
  async indexChunks(
    chunks: ChunkWithVector[],
    conversationId: number,
  ): Promise<void> {
    const previous = this.indexLocks.get(conversationId) ?? Promise.resolve();
    const run = previous.then(() => this.doIndexChunks(chunks, conversationId));

    // Evict the lock once settled, but only if no newer call has replaced it
    // in the meantime — otherwise a concurrent indexChunks() for the same
    // conversation would lose its serialization. Without this, indexLocks
    // would grow by one entry per distinct conversationId forever.
    const tracked: Promise<void> = run
      .catch(() => undefined)
      .then(() => {
        if (this.indexLocks.get(conversationId) === tracked) {
          this.indexLocks.delete(conversationId);
        }
      });
    this.indexLocks.set(conversationId, tracked);

    return run;
  }

  private async doIndexChunks(
    chunks: ChunkWithVector[],
    conversationId: number,
  ): Promise<void> {
    await this.qdrant.deleteByConversation(conversationId);

    if (chunks.length === 0) {
      // Nothing to index — evict rather than caching empty structures, so a
      // conversation that's cleared (or never indexed again) doesn't hold
      // its map entries forever.
      this.chunkIndex.delete(conversationId);
      this.bm25Corpus.delete(conversationId);
      return;
    }

    const points = chunks.map((chunk) => ({
      id: chunk.chunkId,
      vector: chunk.vector,
      payload: {
        chunkId: chunk.chunkId,
        conversationId,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        participants: chunk.participants,
      },
    }));
    await this.qdrant.upsert(points);

    // Cache payloads for BM25 retrieval.
    const payloads = chunks.map((c) => ({
      chunkId: c.chunkId,
      conversationId,
      text: c.text,
      startTime: c.startTime,
      endTime: c.endTime,
      participants: c.participants,
    }));
    this.chunkIndex.set(conversationId, payloads);
    this.bm25Corpus.set(
      conversationId,
      buildBm25Corpus(payloads.map((p) => p.text)),
    );
  }

  /**
   * Hybrid retrieval: fuse Qdrant vector search and in-memory BM25 via
   * Reciprocal Rank Fusion (RRF), return the top-K de-duplicated chunks.
   *
   * @param vectorOnly  When true, skip BM25 and return pure vector results.
   *                    Used by the ablation harness to compare retrieval modes.
   */
  async retrieve(
    query: string,
    conversationId: number,
    topK = 5,
    vectorOnly = false,
  ): Promise<ChunkPayload[]> {
    if (vectorOnly) {
      return this.retrieveVector(query, conversationId, topK);
    }

    const vectorResults = await this.retrieveVector(
      query,
      conversationId,
      topK * 2,
    );
    const bm25Results = this.retrieveBm25(query, conversationId, topK * 2);

    return this.fuseRrf(vectorResults, bm25Results, topK);
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private async retrieveVector(
    query: string,
    conversationId: number,
    limit: number,
  ): Promise<ChunkPayload[]> {
    const vector = await this.embedder.embedQuery(query);
    return this.qdrant.search(
      vector,
      conversationId,
      limit,
      this.minVectorScore,
    );
  }

  private retrieveBm25(
    query: string,
    conversationId: number,
    topK: number,
  ): ChunkPayload[] {
    const cached = this.chunkIndex.get(conversationId) ?? [];
    const corpus = this.bm25Corpus.get(conversationId);
    if (cached.length === 0 || !corpus) return [];

    const queryTokens = tokenize(query);
    const scores = bm25Scores(queryTokens, corpus);

    return cached
      .map((chunk, i) => ({ chunk, score: scores[i] }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk }) => chunk);
  }

  private fuseRrf(
    vectorRanked: ChunkPayload[],
    bm25Ranked: ChunkPayload[],
    topK: number,
  ): ChunkPayload[] {
    const scoreMap = new Map<string, number>();
    const chunkById = new Map<string, ChunkPayload>();

    const applyList = (list: ChunkPayload[]) => {
      list.forEach((chunk, rank) => {
        const prev = scoreMap.get(chunk.chunkId) ?? 0;
        scoreMap.set(chunk.chunkId, prev + rrfScore(rank));
        chunkById.set(chunk.chunkId, chunk);
      });
    };

    applyList(vectorRanked);
    applyList(bm25Ranked);

    return [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id]) => chunkById.get(id)!);
  }
}
