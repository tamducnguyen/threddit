import { Injectable } from '@nestjs/common';
import { PreprocessorService } from './preprocessor.service';
import { ChunkerService } from './chunker.service';
import { EmbedderService } from './embedder.service';
import { RetrieverService } from './retriever.service';
import { SummarizerService } from './summarizer.service';
import { TopicDetectorService } from './topic-detector.service';
import { RagSourceMessage } from './interfaces/rag.interface';

@Injectable()
export class RagService {
  constructor(
    private readonly preprocessor: PreprocessorService,
    private readonly chunker: ChunkerService,
    private readonly embedder: EmbedderService,
    private readonly retriever: RetrieverService,
    private readonly summarizer: SummarizerService,
    private readonly topicDetector: TopicDetectorService,
  ) {}

  /**
   * Refresh the searchable context for one conversation. Messages are embedded
   * first so the chunker can group nearby semantic turns before chunk vectors
   * are stored in Qdrant and the BM25 cache.
   */
  async indexConversation(
    conversationId: number,
    messages: RagSourceMessage[],
  ): Promise<{ indexedChunkCount: number }> {
    const clean = this.preprocessor.preprocess(messages);

    const messageVectors =
      clean.length > 0
        ? await this.embedder.embedTexts(clean.map((m) => m.text))
        : [];

    const chunks = this.chunker.chunk(clean, messageVectors);
    const embedded =
      chunks.length > 0 ? await this.embedder.embedChunks(chunks) : [];
    await this.retriever.indexChunks(embedded, conversationId);

    return { indexedChunkCount: embedded.length };
  }

  /**
   * Full RAG pass for a topic over a conversation's raw messages:
   * preprocess → embed messages → semantic chunk → embed chunks
   * → index (Qdrant + BM25) → hybrid retrieve → summarize.
   * Re-indexes on every call so vectors stay current.
   *
   * @param vectorOnly  Pass true to skip BM25 and use vector-only retrieval
   *                    (used by the ablation harness).
   */
  async summarizeConversation(
    conversationId: number,
    topic: string,
    messages: RagSourceMessage[],
    vectorOnly = false,
  ): Promise<{ summary: string; retrievedChunkCount: number }> {
    // Re-index unconditionally (even with zero chunks) so the conversation's
    // previously indexed chunks are cleared. Otherwise an empty/narrowed input
    // — e.g. the requester has read everything — would still retrieve stale,
    // already-read chunks left in the index by earlier calls.
    await this.indexConversation(conversationId, messages);

    const retrieved = await this.retriever.retrieve(
      topic,
      conversationId,
      5,
      vectorOnly,
    );
    const summary = await this.summarizer.summarize(topic, retrieved);

    return { summary, retrievedChunkCount: retrieved.length };
  }

  /**
   * Detect the main discussion topics in a conversation without requiring
   * the user to supply a topic upfront.
   */
  async detectTopics(
    messages: RagSourceMessage[],
  ): Promise<string[]> {
    const clean = this.preprocessor.preprocess(messages);
    return this.topicDetector.detectTopics(clean);
  }
}
