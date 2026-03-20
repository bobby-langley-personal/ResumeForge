// Shared JSON parser for Claude API responses
// Critical: Claude often returns JSON wrapped in markdown fences
// Always use this instead of raw JSON.parse() on API responses

export function parseStageJSON<T>(input: string): T {
  // Strip markdown code fences regardless of language tag, line endings, or trailing whitespace
  const cleanInput = input.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(cleanInput);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    console.error('Input was:', input);
    throw new Error(`Invalid JSON format: ${error}`);
  }
}