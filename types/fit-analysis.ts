export type OverallFit = 'Strong Fit' | 'Good Fit' | 'Stretch Role'

export type RoleType =
  | 'technical'
  | 'management'
  | 'sales'
  | 'customer_success'
  | 'research'
  | 'other'

export interface FitAnalysis {
  overallFit: OverallFit
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  plannedImprovements: string[]
  roleType: RoleType
}
