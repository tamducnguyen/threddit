import { ChunkerService } from './chunker.service';
import { CleanMessage } from './interfaces/rag.interface';

describe('ChunkerService', () => {
  let service: ChunkerService;

  beforeEach(() => {
    service = new ChunkerService();
  });

  const msg = (sender: string, text: string, iso: string): CleanMessage => ({
    sender,
    text,
    timestamp: new Date(iso).toISOString(),
  });

  // ── baseline (no vectors) ──────────────────────────────────────────────────

  it('returns no chunks for empty input', () => {
    expect(service.chunk([])).toEqual([]);
  });

  it('splits when the gap between messages exceeds timeGapMinutes', () => {
    const messages = [
      msg('a', 'one', '2026-01-01T00:00:00Z'),
      msg('b', 'two', '2026-01-01T00:05:00Z'), // +5m, same chunk
      msg('a', 'three', '2026-01-01T00:40:00Z'), // +35m, new chunk
    ];

    const chunks = service.chunk(messages, [], 15, 20);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].messages).toHaveLength(2);
    expect(chunks[1].messages).toHaveLength(1);
  });

  it('splits when a chunk reaches maxSize', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      msg('a', `m${i}`, `2026-01-01T00:0${i}:00Z`),
    );

    const chunks = service.chunk(messages, [], 60, 2);

    expect(chunks).toHaveLength(3); // 2 + 2 + 1
    expect(chunks.map((c) => c.messages.length)).toEqual([2, 2, 1]);
  });

  it('loses no messages across all chunks', () => {
    const messages = Array.from({ length: 17 }, (_, i) =>
      msg('a', `m${i}`, `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`),
    );

    const chunks = service.chunk(messages, [], 15, 5);
    const total = chunks.reduce((sum, c) => sum + c.messages.length, 0);

    expect(total).toBe(messages.length);
  });

  it('builds chunk metadata: text, participants, time bounds', () => {
    const messages = [
      msg('alice', 'chào', '2026-01-01T00:00:00Z'),
      msg('bob', 'ừ chào', '2026-01-01T00:01:00Z'),
      msg('alice', 'ok', '2026-01-01T00:02:00Z'),
    ];

    const [chunk] = service.chunk(messages);

    expect(chunk.text).toBe('alice: chào\nbob: ừ chào\nalice: ok');
    expect(chunk.participants.sort()).toEqual(['alice', 'bob']);
    expect(chunk.startTime).toBe(messages[0].timestamp);
    expect(chunk.endTime).toBe(messages[2].timestamp);
    expect(typeof chunk.chunkId).toBe('string');
  });

  // ── semantic boundary detection ────────────────────────────────────────────

  it('splits on low cosine similarity when vectors are provided', () => {
    const messages = [
      msg('a', 'lập trình', '2026-01-01T00:00:00Z'),
      msg('b', 'python', '2026-01-01T00:01:00Z'),
      // orthogonal → topic shift
      msg('a', 'ẩm thực', '2026-01-01T00:02:00Z'),
      msg('b', 'phở bò', '2026-01-01T00:03:00Z'),
    ];

    // First pair: similar (high cosine sim ≈ 0.99)
    // Pair at index 1→2: orthogonal → sim = 0 < threshold 0.75 → new chunk
    const vecs: number[][] = [
      [1, 0], // "lập trình"
      [0.98, 0.2], // "python"  — close to [1,0]
      [0, 1], // "ẩm thực"  — orthogonal
      [0.1, 0.99], // "phở bò"  — close to [0,1]
    ];

    const chunks = service.chunk(messages, vecs, 60, 20, 0.75);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].messages).toHaveLength(2);
    expect(chunks[1].messages).toHaveLength(2);
  });

  it('keeps messages in one chunk when all vectors are similar', () => {
    const messages = [
      msg('a', 'task A', '2026-01-01T00:00:00Z'),
      msg('b', 'task B', '2026-01-01T00:01:00Z'),
      msg('a', 'task C', '2026-01-01T00:02:00Z'),
    ];

    // All pointing in roughly the same direction → sim > 0.75
    const vecs: number[][] = [
      [0.9, 0.1],
      [0.95, 0.05],
      [0.88, 0.12],
    ];

    const chunks = service.chunk(messages, vecs, 60, 20, 0.75);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].messages).toHaveLength(3);
  });

  it('falls back to time-gap when vectors are not provided', () => {
    const messages = [
      msg('a', 'hello', '2026-01-01T00:00:00Z'),
      msg('b', 'world', '2026-01-01T01:00:00Z'), // +60m > 15m gap
    ];

    // No vectors → fall back to time gap only
    const chunks = service.chunk(messages, [], 15, 20, 0.75);

    expect(chunks).toHaveLength(2);
  });

  it('loses no messages when semantic + time boundaries combine', () => {
    const n = 12;
    const messages = Array.from({ length: n }, (_, i) =>
      msg('a', `msg${i}`, `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`),
    );
    // Alternate between two orthogonal directions → many semantic splits
    const vecs = messages.map((_, i) => (i % 2 === 0 ? [1, 0] : [0, 1]));

    const chunks = service.chunk(messages, vecs, 60, 20, 0.75);
    const total = chunks.reduce((sum, c) => sum + c.messages.length, 0);

    expect(total).toBe(n);
  });
});
