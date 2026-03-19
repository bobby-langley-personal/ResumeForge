/**
 * Central model registry for all AI models used in ResumeForge
 * Always use these constants instead of hardcoding model strings
 */

export const MODELS = {
  SONNET: 'claude-3-5-sonnet-20241022',
  HAIKU: 'claude-3-haiku-20240307'
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];