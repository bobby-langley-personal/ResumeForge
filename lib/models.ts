export const MODELS = {
  SONNET: 'claude-3-5-sonnet-20241022',
  HAIKU: 'claude-3-haiku-20240307'
} as const;

export type ModelName = typeof MODELS[keyof typeof MODELS];