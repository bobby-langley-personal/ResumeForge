// Fetches available Anthropic models and picks the best Sonnet and Haiku.
// Uses Next.js fetch caching (revalidates every hour) so the API is not
// called on every request.

interface AnthropicModel {
  id: string;
  display_name: string;
  created_at: string;
}

export async function getModels(): Promise<{ SONNET: string; HAIKU: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    // Cache for 1 hour — model lists change infrequently
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

  const data = await res.json();
  const models: AnthropicModel[] = data.data ?? [];

  // Sort newest first by created_at, then pick first match for each family
  const sorted = [...models].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const sonnet = sorted.find(m => m.id.includes('sonnet'));
  const haiku = sorted.find(m => m.id.includes('haiku'));

  if (!sonnet) throw new Error('No Sonnet model found in Anthropic model list');
  if (!haiku) throw new Error('No Haiku model found in Anthropic model list');

  return { SONNET: sonnet.id, HAIKU: haiku.id };
}

export type ModelType = string;
