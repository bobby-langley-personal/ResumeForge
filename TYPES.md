# Types and Interfaces

Current type definitions for the ResumeForge codebase. This is the source of truth for database columns and shared interfaces.

---

## Database Types

### `Database`
Main Supabase schema interface (`types/supabase.ts`). All table Row/Insert/Update types are derived from this.

### `Json`
`string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`

---

## Table: `resumes` (My Documents library)

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | UUID, primary key |
| `user_id` | string | Clerk user ID |
| `title` | string | Display name |
| `content` | Json | `{ text: string, fileName?: string }` — stored as JSONB |
| `item_type` | ItemType | `'resume' \| 'cover_letter' \| 'portfolio' \| 'other'` |
| `is_default` | boolean | Only one per user (partial unique index) |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

### `ItemType`
`'resume' | 'cover_letter' | 'portfolio' | 'other'`

### `ITEM_TYPE_LABELS`
Display labels map: `{ resume: 'Resume', cover_letter: 'Cover Letter', portfolio: 'Portfolio', other: 'Other' }`

### `ResumeItem`
```typescript
{
  id: string
  user_id: string
  title: string
  content: { text: string; fileName?: string }
  item_type: ItemType
  is_default: boolean
  created_at: string
  updated_at: string
}
```

---

## Table: `applications` (AI Resumes)

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | UUID, primary key |
| `user_id` | string | Clerk user ID |
| `company` | string | Company name |
| `job_title` | string | Position title |
| `job_description` | string | Full job posting text |
| `job_url` | string \| null | Source URL if imported |
| `source_resume_id` | string \| null | Library item used as base |
| `resume_content` | string \| null | Generated resume text |
| `cover_letter_content` | string \| null | Generated cover letter text |
| `status` | ApplicationStatus | Not shown in UI, kept in DB |
| `fit_analysis` | Json \| null | Stored `FitAnalysis` object |
| `questions` | Json \| null | `string[]` — pasted application questions |
| `question_answers` | Json \| null | `ApplicationQuestion[]` — AI-generated answers |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

### `ApplicationStatus`
`'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'`
> Status is stored in the database but intentionally not exposed in the UI.

### `ApplicationItem` (dashboard display type)
Exported from `app/dashboard/page.tsx`:
```typescript
{
  id: string
  company: string
  job_title: string
  cover_letter_content: string | null
  question_answers: { question: string; answer: string }[] | null
  created_at: string
}
```

### `ResumePDFProps`
```typescript
{
  resumeText: string
  candidateName: string
  company: string
  jobTitle: string
  compact?: boolean   // applies 15% reduction to all margin/padding values
}
```

### `ApplicationQuestion`
```typescript
{
  question: string   // original question text
  answer: string     // AI-generated answer
}
```

---

## Fit Analysis Types (`types/fit-analysis.ts`)

### `OverallFit`
`'Strong Fit' | 'Good Fit' | 'Stretch Role'`

### `RoleType`
`'technical' | 'management' | 'sales' | 'customer_success' | 'research' | 'other'`

### `FitPoint`
```typescript
{
  point: string      // the insight text
  source?: string    // artifact name it came from ("Primary Resume" or library item title)
}
```

### `FitAnalysis`
```typescript
{
  overallFit: OverallFit
  strengths: FitPoint[]
  gaps: FitPoint[]
  suggestions: FitPoint[]
  plannedImprovements: string[]   // 3–5 concrete resume changes the generator will make
  roleType: RoleType
}
```

---

## Interview Types (`app/interview/`)

### `CompletedRole`
```typescript
{
  company: string
  title: string
  startDate: string
  endDate: string
  history: ChatMessage[]   // full conversation for this role
}
```

### `ExtractedRole`
```typescript
{
  company: string
  title: string
  startDate: string   // format matches source doc (e.g. "Jan 2022", "2022")
  endDate: string
}
```

### `DisplayMessage`
```typescript
{ role: 'ai' | 'user'; content: string }  // CHOICES: line stripped from AI messages
```

### `ChatMessage`
```typescript
{ role: 'user' | 'assistant'; content: string }
```

### `CHOICES:` Protocol
Claude ends adaptive chat messages with a `CHOICES: A | B | C` line. `InterviewClient` parses this with `parseChoices(text)`:
- Strips the `CHOICES:` line from the display string
- Returns the choices as a `string[]` for rendering as quick-reply pill buttons
- The special choice `"Move to next role"` triggers `finishRole()` instead of sending to the AI

### `InterviewSystemContext`
```typescript
{
  currentRole: { company: string; title: string }
  companyResearch?: string
  existingDocuments?: string
  rolesRemaining: number
}
```

### `InterviewChatRequest`
```typescript
{
  message: string
  history: ChatMessage[]
  systemContext: InterviewSystemContext
}
```

### `InterviewTranscript`
```typescript
{
  company: string
  title: string
  startDate: string
  endDate: string
  history: ChatMessage[]
}
```

### `InterviewGenerateRequest`
```typescript
{
  transcript: InterviewTranscript[]
}
```

---

## Table: `interview_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | UUID, primary key |
| `user_id` | string | Clerk user ID |
| `status` | `'draft' \| 'complete'` | `'draft'` while in progress |
| `completed_roles` | Json | `CompletedRole[]` — roles finished so far |
| `draft_state` | Json \| null | Full `InterviewDraft` snapshot for resuming |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp (auto-updated by trigger) |

### `InterviewDraft`
```typescript
{
  totalRoles: number
  currentRoleIndex: number
  completedRoles: CompletedRole[]
  company: string
  jobTitle: string
  startDate: string
  endDate: string
  researchSummary: string
  history: ChatMessage[]
  displayMessages: DisplayMessage[]
  choices: string[]
  useExistingDocs: boolean
  existingDocsContext: string
  resumeStep: 'role-setup' | 'interview'
}
```

---

## Model Types (`lib/models.ts`)

### Current model IDs
- `SONNET`: `claude-sonnet-4-6` (used for document generation)
- `HAIKU`: `claude-haiku-4-5-20251001` (used for fit analysis)

> Never hardcode these. Use `getModels()` which fetches from the Anthropic API with a 1-hour in-memory cache and hardcoded fallback.
