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

export interface KeywordMatch {
  matched: string[]
  missing: string[]
}

export interface FitAnalysis {
  overallFit: OverallFit
  strengths: FitPoint[]
  gaps: FitPoint[]
  suggestions: FitPoint[]
  plannedImprovements: string[]
  roleType: RoleType
  // Optional — absent on pre-ticket saved rows, always present on new ones
  matchScore?: number       // 0–100 deterministic: background vs JD keywords
  keywords?: KeywordMatch   // matched/missing keyword lists
}
