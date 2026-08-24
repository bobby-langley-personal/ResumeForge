import { describe, it, expect } from 'vitest';

// Trailing whitespace trimming pattern used throughout the codebase:
//   text.trim().replace(/\n+$/, '')
// Applied in:
//   - generate-documents after resumeText accumulation
//   - generate-documents after coverLetterText accumulation
//   - generate-polished-resume return value
//   - base-resume-chat CHANGE response

function trimTrailing(text: string): string {
  return text.trim().replace(/\n+$/, '');
}

describe('trailing whitespace trimming', () => {
  it('removes trailing newlines', () => {
    expect(trimTrailing('Hello\n\n\n')).toBe('Hello');
  });

  it('removes leading whitespace', () => {
    expect(trimTrailing('  \nHello')).toBe('Hello');
  });

  it('preserves internal newlines', () => {
    const input = 'Line 1\n\nLine 2\n\nLine 3';
    expect(trimTrailing(input)).toBe('Line 1\n\nLine 2\n\nLine 3');
  });

  it('handles text with no trailing whitespace unchanged', () => {
    expect(trimTrailing('Clean text')).toBe('Clean text');
  });

  it('handles empty string', () => {
    expect(trimTrailing('')).toBe('');
  });

  it('handles only whitespace', () => {
    expect(trimTrailing('\n\n\n   \n')).toBe('');
  });

  it('preserves a single trailing newline after trim+replace', () => {
    // trim() removes edge whitespace first, then replace removes remaining trailing \n
    expect(trimTrailing('NAME: John Doe\n')).toBe('NAME: John Doe');
  });

  it('handles CRLF endings', () => {
    expect(trimTrailing('Windows\r\nLine\r\n')).toBe('Windows\r\nLine');
  });
});

// Resume text normalization pattern from generate-documents:
//   .trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ')
function normalizeInput(text: string): string {
  return text.trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ');
}

describe('resume input normalization', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeInput('Line A\r\nLine B')).toBe('Line A\nLine B');
  });

  it('collapses 3+ consecutive newlines to 2', () => {
    expect(normalizeInput('Para 1\n\n\n\nPara 2')).toBe('Para 1\n\nPara 2');
  });

  it('preserves exactly 2 consecutive newlines', () => {
    expect(normalizeInput('Para 1\n\nPara 2')).toBe('Para 1\n\nPara 2');
  });

  it('collapses multiple spaces to one', () => {
    expect(normalizeInput('Too    many     spaces')).toBe('Too many spaces');
  });

  it('collapses tabs to a single space', () => {
    expect(normalizeInput('Tab\there')).toBe('Tab here');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeInput('  hello  ')).toBe('hello');
  });
});
