export type ItemType = 'resume' | 'cover_letter' | 'portfolio' | 'other' | 'base_resume'

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter Example',
  portfolio: 'Portfolio / Work Sample',
  other: 'Other',
  base_resume: 'Base Resume',
}

export interface ResumeContent {
  text: string
  fileName?: string  // set when created from file upload
}

export interface ResumeItem {
  id: string
  user_id: string
  title: string
  content: ResumeContent
  item_type: ItemType
  is_default: boolean
  created_at: string
  updated_at: string
}
