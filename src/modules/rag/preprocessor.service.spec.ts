import { PreprocessorService } from './preprocessor.service';
import { RagSourceMessage } from './interfaces/rag.interface';

describe('PreprocessorService', () => {
  let service: PreprocessorService;

  beforeEach(() => {
    service = new PreprocessorService();
  });

  const at = (iso: string) => new Date(iso);

  it('drops revoked, null-text, empty, and emoji-only messages', () => {
    const messages: RagSourceMessage[] = [
      {
        sender: 'a',
        text: 'Xin chào',
        isRevoked: false,
        createdAt: at('2026-01-01T00:00:00Z'),
      },
      {
        sender: 'b',
        text: 'đã thu hồi',
        isRevoked: true,
        createdAt: at('2026-01-01T00:01:00Z'),
      },
      {
        sender: 'c',
        text: null,
        isRevoked: false,
        createdAt: at('2026-01-01T00:02:00Z'),
      },
      {
        sender: 'd',
        text: '   ',
        isRevoked: false,
        createdAt: at('2026-01-01T00:03:00Z'),
      },
      {
        sender: 'e',
        text: '😀😀',
        isRevoked: false,
        createdAt: at('2026-01-01T00:04:00Z'),
      },
    ];

    const result = service.preprocess(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ sender: 'a', text: 'Xin chào' });
  });

  it('normalizes whitespace and emits ISO timestamps', () => {
    const result = service.preprocess([
      {
        sender: 'a',
        text: '  nhôm   nay\n\thọp  dự án  ',
        isRevoked: false,
        createdAt: at('2026-01-01T08:30:00Z'),
      },
    ]);

    expect(result[0].text).toBe('nhôm nay họp dự án'); // collapsed + trimmed
    expect(result[0].timestamp).toBe('2026-01-01T08:30:00.000Z');
  });

  it('returns an empty array for no input', () => {
    expect(service.preprocess([])).toEqual([]);
  });
});
