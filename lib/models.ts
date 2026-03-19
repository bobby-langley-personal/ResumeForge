// Central model registry for Anthropic API calls
// Always use these constants instead of hardcoding model strings

export const MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-3-5-haiku-20241022'
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];