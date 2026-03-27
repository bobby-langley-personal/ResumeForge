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
| `item_type` | ItemType | `'resume' \| 'cover_letter' \| 'portfolio' \| 'other' \| 'base_resume'` |
| `is_default` | boolean | Only one per user (partial unique index) |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

### `ItemType`
`'resume' | 'cover_letter' | 'portfolio' | 'other' | 'base_resume'`

`base_resume` is the user's master resume — always `is_default: true`, stored with title `'Base Resume'`. Not shown in ContextSelector or document list; managed separately via `/base-resume` page.

### `ITEM_TYPE_LABELS`
Display labels map: `{ resume: 'Resume', cover_letter: 'Cover Letter', portfolio: 'Portfolio', other: 'Other', base_resume: 'Base Resume' }`

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
| `interview_prep` | Json \| null | Stored `InterviewPrep` object |
| `chat_history` | Json \| null | `ResumeChatMessage[]` — persisted chat turns |
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

### PDF Experience Structure
The PDF parser groups experience entries by company. Multiple roles at the same company are rendered under one company header:
```
Company | Location
  Job Title (bold)          Dates (italic, right-aligned)
  • bullet
  Additional Title (bold)   Dates
  • bullet
```
**Pattern A** (new company): `Company | Location | Dates` — 3 pipe-separated parts
**Pattern B** (additional role): `Title | Dates` — 2 parts where second matches `/(\d{4}|Present)/i`

### `ApplicationQuestion`
```typescript
{
  question: string   // original question text
  answer: string     // AI-generated answer
}
```

---

## Resume Chat Types (`components/ResumeChatPanel.tsx`, `app/api/resume-chat/route.ts`)

### `ResumeChatMessage`
```typescript
{
  role: 'user' | 'assistant'
  content: string
  type?: 'change' | 'answer'   // assistant messages only; 'change' = resume was updated
}
```

### `ResumeChatRequest`
```typescript
{
  applicationId: string
  message: string
  currentResumeText: string
  originalResumeText: string
  coverLetterText?: string
  jobDescription: string
  company: string
  jobTitle: string
  backgroundExperience: string
  chatHistory: { role: 'user' | 'assistant'; content: string }[]  // last 10 turns
}
```

### `ResumeChatResponse`
```typescript
{
  type: 'change' | 'answer'
  message: string           // change description or answer text
  updatedResume?: string    // present only when type === 'change'
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

### `FitAnalysisModalProps`
```typescript
{
  fitAnalysis: FitAnalysis
  company: string
  jobTitle: string
  createdAt?: string        // ISO string — formatted as "Month D, YYYY" in modal header
  onClose: () => void
  actions?: React.ReactNode // optional slot — home page passes Generate/Start Over buttons
}
```

---

## Interview Prep Types (`types/interview-prep.ts`)

### `InterviewQuestionCategory`
`'technical' | 'behavioral' | 'motivation' | 'background' | 'situational' | 'curveball'`

### `InterviewQuestion`
```typescript
{
  category: InterviewQuestionCategory
  question: string
  hint: string[]          // 2–3 talking points grounded in the resume
  resumeReference: string // direct quote or detail from the generated resume
}
```

### `InterviewPrep`
```typescript
{
  questions: InterviewQuestion[]  // always 8 questions across 6 categories
}
```

### `InterviewPrepRequest`
```typescript
{
  applicationId: string
  jobTitle: string
  company: string
  jobDescription: string
  generatedResume: string
  toughQuestions?: string[]  // application question text, folded into prompt if present
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
