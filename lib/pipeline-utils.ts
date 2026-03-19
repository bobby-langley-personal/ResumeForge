/**
 * Shared JSON parser utilities for handling Claude API responses
 * Always use parseStageJSON() instead of raw JSON.parse() on API responses
 */

/**
 * Parses JSON from Claude responses that may contain markdown code fences
 * @param response - Raw response string that may contain ```json fences
 * @returns Parsed JSON object
 */
export function parseStageJSON<T = any>(response: string): T {
  let cleanedResponse = response.trim();
  
  // Remove markdown code fences if present
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  
  return JSON.parse(cleanedResponse.trim());
}

/**
 * Safely attempts to parse JSON with fallback handling
 * @param response - Raw response string
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed JSON or fallback value
 */
export function safeParse<T>(response: string, fallback: T): T {
  try {
    return parseStageJSON<T>(response);
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return fallback;
  }
}