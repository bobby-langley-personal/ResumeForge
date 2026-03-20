# Claude Development Guide

This file contains important guidelines and rules for working with the ResumeForge codebase.

## UI Terminology

Use these terms consistently in all user-facing text:

| Concept | Term to use |
|---------|------------|
| The page at `/dashboard` | "AI Resumes" |
| The page at `/resumes` | "My Documents" |
| A generated resume record | "resume" (not "application") |
| Creating a new tailored resume | "Tailor New Resume" |
| The library context picker | "Load from My Documents" |

Never use "Dashboard", "Library", "application/s" (in UI copy), or "New Application" — these were replaced.

---

## Database Schema Rules

The schema defined in TYPES.md is the source of truth. Never reference columns that are not defined there.

### Applications Table
Current valid columns:
- `id` (string) - Primary key
- `user_id` (string) - Foreign key to users
- `company` (string) - Company name
- `job_title` (string) - Position title
- `job_description` (string) - Job posting description
- `job_url` (string | null) - Link to job posting (saved when URL import is used)
- `source_resume_id` (string | null) - ID of source resume used
- `resume_content` (string | null) - Generated resume text
- `cover_letter_content` (string | null) - Generated cover letter text
- `status` (ApplicationStatus) - Enum (kept in DB, not exposed in UI)
- `fit_analysis` (Json | null) - Stored FitAnalysis object
- `created_at` (string) - Auto-populated by Postgres default
- `updated_at` (string) - Auto-updated by Postgres

**Status editing is intentionally removed from the UI** — do not re-add it.

### Resumes Table (My Documents library)
Current valid columns:
- `id`, `user_id`, `title`, `content` (JSONB: `{ text: string, fileName?: string }`), `item_type`, `is_default`, `created_at`, `updated_at`
- `item_type` values: `'resume' | 'cover_letter' | 'portfolio' | 'other'`
- Only one item per user can have `is_default = true` (enforced by partial unique index)

**If a new column is genuinely needed:**
1. Add it to TYPES.md FIRST
2. Write a migration in `/supabase/migrations/` (e.g. `006_add_column.sql`)
3. Include instructions comment: `-- Run in Supabase SQL editor → Dashboard → SQL Editor`
4. Only then write application code using the new column

---

## API Routes

| Route | Runtime | Purpose |
|-------|---------|---------|
| `POST /api/analyze-fit` | Node | Haiku fit analysis — returns JSON FitAnalysis |
| `POST /api/generate-documents` | Edge | SSE stream — resume (+ optional cover letter) |
| `POST /api/fetch-job-posting` | Node | URL scrape — HTML extraction, company/title detection |
| `POST /api/extract-resume` | Node | PDF/DOCX text extraction |
| `POST /api/download-pdf/[type]` | Node | PDF generation and download |
| `GET /api/resumes` | Node | List My Documents (default first, then created_at desc) |
| `POST /api/resumes` | Node | Save new document to library |
| `DELETE /api/applications` | Node | Bulk delete by `ids` array |
| `DELETE /api/applications/[id]` | Node | Delete single resume record |

### generate-documents request fields
- `company`, `jobTitle`, `jobDescription`, `backgroundExperience` — required
- `jobUrl` — optional string, saved to `applications.job_url` if provided
- `isFromUploadedFile` — boolean, affects resume prompt framing
- `fitAnalysis` — pre-computed FitAnalysis (skips re-analysis)
- `includeCoverLetter` — boolean (default false)
- `additionalContext` — array of `{ title, type, text }` from My Documents

### fetch-job-posting behavior
- Blocks `linkedin.com/jobs` URLs — returns `{ error, code: 'LINKEDIN_BLOCKED' }` with status 422
- Strips scripts, styles, nav, header, footer from HTML
- Truncates at application form markers ("Apply for this job", "Equal Employment Opportunity", etc.)
- Detects company: `og:site_name` → title "at Company" pattern → Greenhouse/Lever/Workday URL patterns
- Detects job title: `og:title` (stripped) → `<title>` tag fallback
- Returns `{ jobDescription, company?, jobTitle? }`

### analyze-fit response shape (FitAnalysis)
- `strengths`, `gaps`, `suggestions` — `FitPoint[]` where `FitPoint = { point: string, source?: string }`
- `plannedImprovements` — `string[]` of 3–5 concrete resume changes
- `overallFit` — `"Strong Fit" | "Good Fit" | "Stretch Role"`
- `roleType` — `"technical" | "management" | "sales" | "customer_success" | "research" | "other"`

---

## Supabase Client

Use `supabaseServer()` from `@/lib/supabase` — **module-level singleton, not async**.

```typescript
const supabase = supabaseServer(); // correct — no await
```

The service role key (`NEXT_PUBLIC_SUPABASE_SERVICE_KEY`) bypasses RLS. **Always** manually filter by `user_id` in every query — never rely on RLS policies (Clerk's `auth.uid()` returns null in Supabase).

**Never:**
- `await supabaseServer()` — it is not a Promise
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` — RLS will block all Clerk users

---

## Model Selection

Never hardcode model IDs. Use `getModels()` from `@/lib/models`:
- Fetches available models from Anthropic API
- Caches in memory for 1 hour
- Falls back to hardcoded IDs (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) on error

```typescript
const { SONNET, HAIKU } = await getModels();
```

---

## AI Resumes Dashboard (`/dashboard`)

- No status editing — removed intentionally
- `ApplicationItem` type exported from `app/dashboard/page.tsx`, imported by `ApplicationList`
- Multi-select bulk delete via checkboxes; single delete via trash icon on each card
- Data fetched server-side in `DashboardPage`, passed to `ApplicationList` as `initialItems`

---

## My Documents / ContextSelector

- `ContextSelector` auto-loads the default item as primary background on mount
- Pre-selects up to 3 most recent non-default items as additional context; accordion auto-expands
- `key={resetKey}` on `<ContextSelector>` in `app/page.tsx` — incrementing remounts and re-fetches
- Additional context items appear in both analyze-fit and generate-documents prompts with source attribution

---

## Theme

- Dark mode by default, toggled via `dark` class on `<html>`
- Preference stored in `localStorage` under key `'theme'` (`'dark'` or `'light'`)
- Inline script in `app/layout.tsx` applies preference before first paint (no flash)
- Toggle button (Sun/Moon icon) lives in `Navbar.tsx` → `ThemeToggle` component

---

## Branch Naming

All feature/fix branches: `claude/issue-{number}-{YYYYMMDD}-{HHMM}` — Vercel skips deployment on non-main branches.

---

## Development Guidelines

- Read TYPES.md before any database changes
- Run `npx tsc --noEmit` before committing — all PRs must be type-clean
- Use `gh issue comment` to post progress updates on GitHub issues
- Dev mode: `[Dev] Fill Test Data` button on home page pre-fills sample job + resume data
