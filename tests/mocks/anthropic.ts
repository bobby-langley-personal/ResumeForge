import { vi } from 'vitest';

export let mockAnthropicResponse = 'ANSWER:\nMock AI response.';
export let mockAnthropicStreamChunks: string[] = ['Mock resume text'];

export function setMockResponse(text: string) {
  mockAnthropicResponse = text;
}

export function setMockStreamChunks(chunks: string[]) {
  mockAnthropicStreamChunks = chunks;
}

// Async iterator for streaming responses
async function* makeAsyncIterator(chunks: string[]) {
  for (const chunk of chunks) {
    yield {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: chunk },
    };
  }
}

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn((opts: { stream?: boolean }) => {
        if (opts.stream) {
          return Promise.resolve(makeAsyncIterator(mockAnthropicStreamChunks));
        }
        return Promise.resolve({
          content: [{ type: 'text', text: mockAnthropicResponse }],
        });
      }),
    },
  })),
  default: vi.fn(),
}));

vi.mock('@/lib/models', () => ({
  getModels: vi.fn(() => Promise.resolve({
    SONNET: 'claude-sonnet-4-6',
    HAIKU: 'claude-haiku-4-5-20251001',
  })),
}));
