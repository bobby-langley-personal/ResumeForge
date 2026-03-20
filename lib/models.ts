// Fetches available Anthropic models and picks the best Sonnet and Haiku.
// Module-level in-memory cache avoids repeated API calls within the same
// process lifetime. Falls back to known-good IDs if the API is unreachable.

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
}

const FALLBACK = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
};

let _cache: { SONNET: string; HAIKU: string } | null = null;
let _cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getModels(): Promise<{ SONNET: string; HAIKU: string }> {
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

    const sorted = [...models].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    _cache = {
      SONNET: sorted.find(m => m.id.includes('sonnet'))?.id ?? FALLBACK.SONNET,
      HAIKU: sorted.find(m => m.id.includes('haiku'))?.id ?? FALLBACK.HAIKU,
    };
    _cacheExpiry = Date.now() + CACHE_TTL;
    return _cache;
  } catch {
    return FALLBACK;
  }
}

export type ModelType = string;
