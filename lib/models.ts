// Fetches available Anthropic models and picks the best Sonnet, Haiku, and Opus.
// - Queries /v1/models on first call; deprecated models are not returned by the API
//   so the newest available model of each tier is always selected automatically.
// - In-memory cache (1 hour) avoids repeated API calls within the same process.
// - Falls back to known-good IDs if the API is unreachable.
// - Env var overrides (CLAUDE_SONNET_MODEL / CLAUDE_HAIKU_MODEL / CLAUDE_OPUS_MODEL)
//   allow pinning to a specific version without a code deploy.

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
}

const FALLBACK = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU:  'claude-haiku-4-5-20251001',
  OPUS:   'claude-opus-4-6',
};

let _cache: typeof FALLBACK | null = null;
let _cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Prefer explicitly versioned models (e.g. claude-sonnet-4-6) over
 * unversioned aliases (claude-sonnet-4) and preview/experimental variants.
 * Higher score = higher preference.
 */
function modelScore(id: string): number {
  if (id.includes('preview') || id.includes('experimental')) return -1;
  // Versioned IDs have a numeric suffix after the model family (e.g. -4-6 or -20251001)
  const hasVersionSuffix = /\d+-\d+(-\d+)?$/.test(id);
  return hasVersionSuffix ? 1 : 0;
}

function pickBest(models: AnthropicModel[], tier: 'sonnet' | 'haiku' | 'opus'): string {
  const matches = models
    .filter(m => m.id.toLowerCase().includes(tier))
    .sort((a, b) => {
      // Primary: prefer versioned over aliases
      const scoreDiff = modelScore(b.id) - modelScore(a.id);
      if (scoreDiff !== 0) return scoreDiff;
      // Secondary: newest created_at wins
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  return matches[0]?.id ?? FALLBACK[tier.toUpperCase() as keyof typeof FALLBACK];
}

export async function getModels(): Promise<typeof FALLBACK> {
  // Env var overrides — useful for pinning without a deploy
  const envOverride = {
    SONNET: process.env.CLAUDE_SONNET_MODEL,
    HAIKU:  process.env.CLAUDE_HAIKU_MODEL,
    OPUS:   process.env.CLAUDE_OPUS_MODEL,
  };
  if (envOverride.SONNET && envOverride.HAIKU && envOverride.OPUS) {
    return { SONNET: envOverride.SONNET, HAIKU: envOverride.HAIKU, OPUS: envOverride.OPUS };
  }

  if (_cache && Date.now() < _cacheExpiry) return _cache;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return FALLBACK;

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return FALLBACK;

    const data = await res.json();
    const models: AnthropicModel[] = data.data ?? [];

    _cache = {
      SONNET: envOverride.SONNET ?? pickBest(models, 'sonnet'),
      HAIKU:  envOverride.HAIKU  ?? pickBest(models, 'haiku'),
      OPUS:   envOverride.OPUS   ?? pickBest(models, 'opus'),
    };
    _cacheExpiry = Date.now() + CACHE_TTL;
    return _cache;
  } catch {
    return FALLBACK;
  }
}

export type ModelType = string;
