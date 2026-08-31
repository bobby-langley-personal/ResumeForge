/**
 * Deterministic keyword scoring library.
 *
 * Keywords are extracted by a single Haiku call in analyze-fit (LLM handles
 * normalization/lemmatization). Scoring is pure TypeScript — same inputs always
 * produce the same number, which is critical for user trust.
 *
 * Match algorithm:
 *   - Normalize both the candidate text and each keyword to lowercase
 *   - A keyword is "matched" if it appears as a whole-word/phrase substring
 *     (simple word-boundary check via regex)
 *   - Score = matched / total * 100, rounded to nearest integer
 */

/** Check if a keyword phrase appears in the candidate text */
function keywordPresent(keyword: string, normalizedText: string): boolean {
  // Escape regex special chars in the keyword
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Word boundary on each end — handles multi-word phrases too
  const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i')
  return re.test(normalizedText)
}

export interface ScoreResult {
  score: number
  matched: string[]
  missing: string[]
}

/**
 * Compute a deterministic match score for a given text against a keyword list.
 *
 * @param keywords - Array of lowercase lemma keywords extracted from the JD
 * @param candidateText - The text to score (background or generated resume)
 * @returns score (0–100), matched keywords, missing keywords
 */
export function computeMatchScore(keywords: string[], candidateText: string): ScoreResult {
  if (!keywords.length) return { score: 0, matched: [], missing: [] }

  const normalizedText = candidateText.toLowerCase()
  const matched: string[] = []
  const missing: string[] = []

  for (const kw of keywords) {
    if (keywordPresent(kw, normalizedText)) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const score = Math.round((matched.length / keywords.length) * 100)
  return { score, matched, missing }
}
