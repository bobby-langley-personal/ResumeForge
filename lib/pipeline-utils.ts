// Shared JSON parser for Claude API responses.
// Claude sometimes wraps JSON in markdown fences, adds preamble text,
// or appends trailing commentary — this handles all of those cases.

export function parseStageJSON<T>(input: string): T {
  const raw = input.trim();

  // Strategy 1: strip markdown fences and try direct parse
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // fall through to extraction
  }

  // Strategy 2: extract the first complete {...} block.
  // Handles preamble text, trailing commentary, and fence remnants.
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    const extracted = stripped.slice(start, end + 1);
    try {
      return JSON.parse(extracted);
    } catch {
      // fall through to error
    }
  }

  // Nothing worked — log the full raw output so we can debug
  console.error('[parseStageJSON] All parse strategies failed.');
  console.error('[parseStageJSON] Raw input length:', raw.length);
  console.error('[parseStageJSON] Raw input (first 500 chars):', raw.slice(0, 500));
  console.error('[parseStageJSON] Raw input (last 200 chars):', raw.slice(-200));

  throw new Error(`Could not extract valid JSON from model response. Input length: ${raw.length}`);
}
