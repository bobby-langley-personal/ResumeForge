import { describe, it, expect } from 'vitest';
import { sanitizeBody } from '@/lib/log-api';

describe('sanitizeBody', () => {
  it('passes through short string values unchanged', () => {
    const result = sanitizeBody({ company: 'Acme', jobTitle: 'Engineer' });
    expect(result.company).toBe('Acme');
    expect(result.jobTitle).toBe('Engineer');
  });

  it('truncates strings longer than maxLen', () => {
    const longStr = 'x'.repeat(400);
    const result = sanitizeBody({ jobDescription: longStr });
    expect(result.jobDescription).toBe('[400 chars]');
  });

  it('uses custom maxLen', () => {
    const result = sanitizeBody({ text: 'hello world' }, 5);
    expect(result.text).toBe('[11 chars]');
  });

  it('summarizes arrays by length', () => {
    const result = sanitizeBody({ items: ['a', 'b', 'c'] });
    expect(result.items).toBe('[array(3)]');
  });

  it('summarizes objects', () => {
    const result = sanitizeBody({ nested: { foo: 'bar' } });
    expect(result.nested).toBe('[object]');
  });

  it('passes through numbers and booleans', () => {
    const result = sanitizeBody({ count: 5, flag: true, nothing: null });
    expect(result.count).toBe(5);
    expect(result.flag).toBe(true);
    expect(result.nothing).toBeNull();
  });

  it('handles empty object', () => {
    expect(sanitizeBody({})).toEqual({});
  });
});
