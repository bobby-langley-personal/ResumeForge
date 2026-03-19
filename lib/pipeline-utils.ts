// Shared JSON parser for Claude API responses
// Critical: Claude often returns JSON wrapped in markdown fences
// Always use this instead of raw JSON.parse() on API responses

export function parseStageJSON<T>(input: string): T {
  let cleanInput = input.trim();
  
  // Remove markdown code fences if present
  if (cleanInput.startsWith('```json\n') && cleanInput.endsWith('\n```')) {
    cleanInput = cleanInput.slice(8, -4);
  } else if (cleanInput.startsWith('```\n') && cleanInput.endsWith('\n```')) {
    cleanInput = cleanInput.slice(4, -4);
  } else if (cleanInput.startsWith('```json') && cleanInput.endsWith('```')) {
    cleanInput = cleanInput.slice(7, -3);
  } else if (cleanInput.startsWith('```') && cleanInput.endsWith('```')) {
    cleanInput = cleanInput.slice(3, -3);
  }
  
  try {
    return JSON.parse(cleanInput.trim());
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    console.error('Input was:', input);
    throw new Error(`Invalid JSON format: ${error}`);
  }
}