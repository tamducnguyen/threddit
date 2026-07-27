import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Chunk, CleanMessage } from './interfaces/rag.interface';

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

@Injectable()
export class ChunkerService {
  /**
   * Group consecutive messages into topic-coherent chunks.
   *
   * Boundary detection (in priority order):
   *  1. Semantic: cosine similarity between adjacent message embeddings < simThreshold
   *  2. Time gap:  gap between consecutive messages exceeds timeGapMinutes
   *  3. Size cap:  current chunk reaches maxSize
   *
   * When messageVectors is omitted or empty, only guards 2 and 3 apply.
   * Every input message lands in exactly one chunk.
   */
  chunk(
    messages: CleanMessage[],
    messageVectors: number[][] = [],
    timeGapMinutes = 15,
    maxSize = 20,
    simThreshold = 0.75,
  ): Chunk[] {
    if (messages.length === 0) return [];

    const gapMs = timeGapMinutes * 60 * 1000;
    const hasVectors = messageVectors.length === messages.length;
    const chunks: Chunk[] = [];
    let current: CleanMessage[] = [];

    const flush = () => {
      if (current.length === 0) return;
      chunks.push(this.buildChunk(current));
      current = [];
    };

    for (let i = 0; i < messages.length; i++) {
      current.push(messages[i]);

      const next = messages[i + 1];
      if (!next) continue;

      const reachedMax = current.length >= maxSize;

      const gapTooBig =
        new Date(next.timestamp).getTime() -
          new Date(messages[i].timestamp).getTime() >
        gapMs;

      const topicShift =
        hasVectors &&
        cosineSim(messageVectors[i], messageVectors[i + 1]) < simThreshold;

      if (reachedMax || gapTooBig || topicShift) {
        flush();
      }
    }
    flush();

    return chunks;
  }

  private buildChunk(messages: CleanMessage[]): Chunk {
    return {
      chunkId: randomUUID(),
      messages,
      startTime: messages[0].timestamp,
      endTime: messages[messages.length - 1].timestamp,
      participants: [...new Set(messages.map((m) => m.sender))],
      text: messages.map((m) => `${m.sender}: ${m.text}`).join('\n'),
    };
  }
}
