import { describe, it, expect } from 'vitest';
import { buildContextBlock, parseStageJSON } from '@/lib/pipeline-utils';

describe('buildContextBlock', () => {
  it('returns empty string for no items', () => {
    expect(buildContextBlock([])).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(buildContextBlock(null as any)).toBe('');
    expect(buildContextBlock(undefined as any)).toBe('');
  });

  it('builds a single context block with title and type', () => {
    const result = buildContextBlock([{ title: 'My Resume', type: 'resume', text: 'Some text' }]);
    expect(result).toContain('### My Resume (resume)');
    expect(result).toContain('Some text');
    expect(result).toContain('Additional context provided by the candidate');
  });

  it('separates multiple items with blank lines', () => {
    const result = buildContextBlock([
      { title: 'Resume', type: 'resume', text: 'Text A' },
      { title: 'Portfolio', type: 'portfolio', text: 'Text B' },
    ]);
    expect(result).toContain('### Resume (resume)');
    expect(result).toContain('### Portfolio (portfolio)');
    expect(result).toContain('Text A');
    expect(result).toContain('Text B');
  });
});

describe('parseStageJSON', () => {
  it('parses clean JSON directly', () => {
    const result = parseStageJSON<{ foo: string }>('{"foo": "bar"}');
    expect(result.foo).toBe('bar');
  });

  it('strips markdown code fences', () => {
    const result = parseStageJSON<{ answer: number }>('```json\n{"answer": 42}\n```');
    expect(result.answer).toBe(42);
  });

  it('strips code fences without language tag', () => {
    const result = parseStageJSON<{ x: boolean }>('```\n{"x": true}\n```');
    expect(result.x).toBe(true);
  });

  it('extracts JSON from preamble text', () => {
    const result = parseStageJSON<{ value: string }>(
      'Here is the JSON you requested:\n\n{"value": "extracted"}\n\nHope that helps!'
    );
    expect(result.value).toBe('extracted');
  });

  it('handles nested objects', () => {
    const result = parseStageJSON<{ answers: { question: string; answer: string }[] }>(
      '{"answers": [{"question": "Q1", "answer": "A1"}]}'
    );
    expect(result.answers).toHaveLength(1);
    expect(result.answers[0].question).toBe('Q1');
  });

  it('throws on completely invalid input', () => {
    expect(() => parseStageJSON('not json at all')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseStageJSON('')).toThrow();
  });
});
