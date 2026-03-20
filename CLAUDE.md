# Claude Development Guide

This file contains important guidelines and rules for working with the ResumeForge codebase.

## Database Schema Rules

The schema defined in TYPES.md is the source of truth. Never reference columns that are not defined there.

### Applications Table Schema
Current valid columns:
- `id` (string) - Primary key
- `user_id` (string) - Foreign key to users
- `company` (string) - Company name
- `job_title` (string) - Position title
- `job_description` (string) - Job posting description
- `job_url` (string | null) - Link to job posting
- `source_resume_id` (string | null) - ID of source resume used
- `generated_resume` (string | null) - Generated resume content
- `generated_cover_letter` (string | null) - Generated cover letter content
- `status` (ApplicationStatus) - Application status enum
- `created_at` (string) - Auto-populated by Postgres default
- `updated_at` (string) - Auto-updated by Postgres

**If a new column is genuinely needed:**
1. Add it to the schema definition in TYPES.md FIRST
2. Write the migration SQL file in `/supabase/migrations/` 
   following the existing naming convention (e.g. `003_add_column.sql`)
3. Include a comment in the migration file with instructions:
```sql
   -- Run this in the Supabase SQL editor:
   -- Dashboard → SQL Editor → paste and run
   alter table applications add column if not exists your_column text;
```
4. Only then write the application code that uses the new column

**Never:**
- Insert into columns that don't exist in the schema above
- Add columns to insert/select statements before adding them
  to the schema here and creating a migration file
- Assume a column exists because it seems logical — check this
  file first

## API Routes

| Route | Runtime | Purpose |
|-------|---------|---------|
| `POST /api/analyze-fit` | Node | Haiku fit analysis — returns JSON FitAnalysis |
| `POST /api/generate-documents` | Edge | SSE stream — resume (+ optional cover letter) generation |
| `POST /api/extract-resume` | Node | PDF/DOCX text extraction |
| `POST /api/download-pdf/[type]` | Node | PDF download for resume or cover letter |
| `DELETE /api/applications` | Node | Bulk delete by `ids` array |
| `DELETE /api/applications/[id]` | Node | Delete single application |
| `GET /api/resumes` | Node | List library items (ordered: default first, then created_at desc) |

### generate-documents request fields
- `company`, `jobTitle`, `jobDescription`, `backgroundExperience` — required
- `isFromUploadedFile` — boolean, affects resume prompt framing
- `fitAnalysis` — pre-computed FitAnalysis from /api/analyze-fit (optional, skips re-analysis)
- `includeCoverLetter` — boolean (default false), skips cover letter phase when false

### analyze-fit response shape
Returns `FitAnalysis` (see `types/fit-analysis.ts`):
- `strengths`, `gaps`, `suggestions` — arrays of `FitPoint { point: string, source?: string }`
- `plannedImprovements` — string[] of 3-5 concrete resume changes the generator will make
- `overallFit` — "Strong Fit" | "Good Fit" | "Stretch Role"
- `roleType` — "technical" | "management" | "sales" | "customer_success" | "research" | "other"

## Supabase Client

Use `supabaseServer()` from `@/lib/supabase` — it is a **module-level singleton** (not async, no `await` needed).
The service role key (`NEXT_PUBLIC_SUPABASE_SERVICE_KEY`) bypasses RLS. Always manually filter by `user_id` in every query.

**Never:**
- Call `await supabaseServer()` — it is not a Promise
- Use the anon key — RLS policies use `auth.uid()` which is always null for Clerk users

## Model Selection

Never hardcode model IDs. Use `getModels()` from `@/lib/models` — fetches from Anthropic API with 1hr in-memory cache and hardcoded fallback.

## Dashboard

- No application status editing — status was intentionally removed (too much manual overhead for users)
- `ApplicationItem` type is exported from `app/dashboard/page.tsx` and imported by `ApplicationList`
- Multi-select bulk delete is supported via checkboxes + destructive button

## ContextSelector behavior

- Auto-loads the default library item as the primary background on mount
- Pre-selects the 3 most recent non-default items as additional context (accordion auto-expands)
- `key={resetKey}` on the component in `app/page.tsx` — incrementing `resetKey` remounts it and re-fetches library on "Generate New Documents"

## Branch Naming

All feature/fix branches must follow `claude/issue-{number}-{YYYYMMDD}-{HHMM}` so Vercel skips deployment on these branches.

## Development Guidelines

- Always read TYPES.md for current type definitions before making database changes
- Use existing patterns and conventions from the codebase
- Follow the architecture rules defined in the repository context
- Use `gh issue comment` to post progress updates on GitHub issues while working