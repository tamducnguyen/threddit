/** Raw message row pulled from PostgreSQL for the RAG pipeline. */
export interface RagSourceMessage {
  sender: string;
  text: string | null;
  isRevoked: boolean;
  createdAt: Date | string;
}

/** A cleaned, RAG-ready message (deleted/empty/emoji-only already dropped). */
export interface CleanMessage {
  sender: string;
  text: string;
  timestamp: string;
}

/** A contiguous slice of conversation grouped by time gap / size. */
export interface Chunk {
  chunkId: string;
  messages: CleanMessage[];
  startTime: string;
  endTime: string;
  participants: string[];
  text: string;
}

/** A chunk with its embedding vector attached. */
export interface ChunkWithVector extends Chunk {
  vector: number[];
}

/** The payload stored in / returned from Qdrant for a chunk. */
export interface ChunkPayload {
  chunkId: string;
  conversationId: number;
  text: string;
  startTime: string;
  endTime: string;
  participants: string[];
}
