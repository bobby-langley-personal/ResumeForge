import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '@/lib/keyword-score';

describe('computeMatchScore', () => {
  it('returns score 0 with empty arrays when no keywords provided', () => {
    const result = computeMatchScore([], 'some candidate text');
    expect(result).toEqual({ score: 0, matched: [], missing: [] });
  });

  it('returns 100 when all keywords are present', () => {
    const result = computeMatchScore(['react', 'typescript', 'node.js'], 'I know react, typescript, and node.js');
    expect(result.score).toBe(100);
    expect(result.matched).toEqual(['react', 'typescript', 'node.js']);
    expect(result.missing).toEqual([]);
  });

  it('returns 0 when no keywords are present', () => {
    const result = computeMatchScore(['python', 'django'], 'I only know JavaScript and React');
    expect(result.score).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(['python', 'django']);
  });

  it('returns correct partial score', () => {
    const result = computeMatchScore(['react', 'python', 'typescript'], 'I have react and typescript experience');
    expect(result.score).toBe(67); // 2/3 = 66.67 → 67
    expect(result.matched).toContain('react');
    expect(result.matched).toContain('typescript');
    expect(result.missing).toContain('python');
  });

  it('is case-insensitive', () => {
    const result = computeMatchScore(['React', 'TypeScript'], 'i know react and typescript');
    expect(result.score).toBe(100);
  });

  it('matches whole words only — does not match substrings', () => {
    // "java" should NOT match inside "javascript"
    const result = computeMatchScore(['java'], 'I use javascript and typescript');
    expect(result.score).toBe(0);
    expect(result.missing).toContain('java');
  });

  it('matches multi-word phrases', () => {
    const result = computeMatchScore(['machine learning', 'data analysis'], 'I have experience in machine learning and data analysis');
    expect(result.score).toBe(100);
  });

  it('does not match partial multi-word phrase', () => {
    const result = computeMatchScore(['machine learning'], 'I use machine tools and learning frameworks');
    expect(result.score).toBe(0);
  });

  it('handles regex special characters in keywords safely', () => {
    // Keywords like "c++" or "node.js" must not throw
    const result = computeMatchScore(['c++', 'node.js'], 'I know c++ and node.js');
    expect(result.score).toBe(100);
  });

  it('score is deterministic — same inputs always produce same output', () => {
    const keywords = ['react', 'graphql', 'postgresql'];
    const text = 'Built apps with react and postgresql';
    const r1 = computeMatchScore(keywords, text);
    const r2 = computeMatchScore(keywords, text);
    expect(r1).toEqual(r2);
  });

  it('rounds to nearest integer', () => {
    // 1 of 3 = 33.33... → 33
    const result = computeMatchScore(['react', 'python', 'go'], 'I know react');
    expect(result.score).toBe(33);
  });
});
