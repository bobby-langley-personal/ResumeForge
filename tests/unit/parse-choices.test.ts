import { describe, it, expect } from 'vitest';

// parseChoices is a module-level function in InterviewClient (not exported).
// We replicate the logic here to test it in isolation — if the implementation
// ever changes, update this copy to match.
function parseChoices(text: string): { display: string; choices: string[] } {
  const lines = text.split('\n');
  const choicesIndex = lines.findLastIndex((l: string) => l.startsWith('CHOICES:'));
  if (choicesIndex === -1) return { display: text, choices: [] };

  const choicesLine = lines[choicesIndex];
  const choices = choicesLine
    .replace('CHOICES:', '')
    .split('|')
    .map((c: string) => c.trim())
    .filter(Boolean);

  const display = lines
    .filter((_: string, i: number) => i !== choicesIndex)
    .join('\n')
    .trim();

  return { display, choices };
}

describe('parseChoices', () => {
  it('returns original text and empty choices when no CHOICES: line', () => {
    const result = parseChoices('Tell me about your experience.');
    expect(result.display).toBe('Tell me about your experience.');
    expect(result.choices).toEqual([]);
  });

  it('strips CHOICES: line from display text', () => {
    const text = 'Great! What area do you want to focus on?\nCHOICES: Technical skills | Leadership | Impact metrics';
    const result = parseChoices(text);
    expect(result.display).toBe('Great! What area do you want to focus on?');
  });

  it('parses pipe-separated choices into array', () => {
    const text = 'Which aspect?\nCHOICES: Option A | Option B | Option C';
    const { choices } = parseChoices(text);
    expect(choices).toEqual(['Option A', 'Option B', 'Option C']);
  });

  it('trims whitespace from each choice', () => {
    const text = 'Pick one:\nCHOICES:  Yes  |  No  |  Maybe  ';
    const { choices } = parseChoices(text);
    expect(choices).toEqual(['Yes', 'No', 'Maybe']);
  });

  it('handles single choice', () => {
    const text = 'Ready?\nCHOICES: Move to next role';
    const { choices } = parseChoices(text);
    expect(choices).toEqual(['Move to next role']);
  });

  it('detects "Move to next role" as a choice (used to trigger role completion)', () => {
    const text = 'Great work! Want to move on?\nCHOICES: Tell me more | Move to next role';
    const { choices } = parseChoices(text);
    expect(choices).toContain('Move to next role');
  });

  it('uses the LAST CHOICES: line when multiple are present', () => {
    const text = 'CHOICES: Old A | Old B\nSome more text.\nCHOICES: New X | New Y';
    const { choices, display } = parseChoices(text);
    expect(choices).toEqual(['New X', 'New Y']);
    expect(display).toContain('CHOICES: Old A | Old B');
    expect(display).toContain('Some more text.');
  });

  it('filters out empty segments from malformed pipe strings', () => {
    const text = 'Go:\nCHOICES: A | | B |';
    const { choices } = parseChoices(text);
    expect(choices).toEqual(['A', 'B']);
  });

  it('returns empty display when CHOICES: is the only line', () => {
    const { display, choices } = parseChoices('CHOICES: Yes | No');
    expect(display).toBe('');
    expect(choices).toEqual(['Yes', 'No']);
  });
});
