export type OverallFit = 'Strong Fit' | 'Good Fit' | 'Stretch Role'

export type RoleType =
  | 'technical'
  | 'management'
  | 'sales'
  | 'customer_success'
  | 'research'
  | 'other'

export interface FitPoint {
  point: string
  source?: string  // artifact title the insight was derived from, omitted if general
}

export interface KeywordTranslation {
  jdTerm: string
  candidatePhrase: string
  confidence: 'high' | 'medium' | 'low'
}

export interface TenseCorrection {
  original: string  // e.g. "Manage a portfolio of..."
  corrected: string // e.g. "Managed a portfolio of..."
}

export interface FitAnalysis {
  overallFit: OverallFit
  strengths: FitPoint[]
  gaps: FitPoint[]
  suggestions: FitPoint[]
  plannedImprovements: string[]
  roleType: RoleType
  keywordTranslations?: KeywordTranslation[]
  tenseCorrections?: TenseCorrection[]
}
