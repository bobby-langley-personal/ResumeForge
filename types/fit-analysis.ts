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

export interface FitAnalysis {
  overallFit: OverallFit
  strengths: FitPoint[]
  gaps: FitPoint[]
  suggestions: FitPoint[]
  plannedImprovements: string[]
  roleType: RoleType
}
