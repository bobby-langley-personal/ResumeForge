# Claude Development Guide

This file contains important guidelines and rules for working with the ResumeForge codebase.

## Definition of Done

Every feature is not complete until ALL of the following are done:
1. Code works and `npx tsc --noEmit` passes
2. **`CLAUDE.md` updated** — routes, components, terminology, architecture decisions
3. **`README.md` updated** — user-facing feature descriptions and project structure
4. **`TYPES.md` updated** — if any types or DB columns changed
5. **GitHub issue comment posted** summarising what was built
6. **Issue closed**

Do not skip any of these steps. If you finish coding but haven't updated docs and closed the issue, you are not done.

---

## UI Terminology

Use these terms consistently in all user-facing text:

| Concept | Term to use |
|---------|------------|
| The page at `/` | "Home" (goal selection / welcome screen) |
| The page at `/tailor` | "Tailor New Resume" (generation form) |
| The page at `/dashboard` | "AI Resumes" |
| The page at `/resumes` | "My Profile" (nav label) / "My Documents" (page heading) |
| The page at `/polished-resume` | "Polished Resume" |
| A generated resume record | "resume" (not "application") |
| The library context picker | "Load from My Documents" |

Nav labels (hamburger menu): "Tailor New Resume" → `/tailor`, "AI Resumes" → `/dashboard`, "My Profile" → `/resumes`.

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
- `questions` (Json | null) - `string[]` of application questions entered by user
- `question_answers` (Json | null) - `ApplicationQuestion[]` of AI-generated answers
- `created_at` (string) - Auto-populated by Postgres default
- `updated_at` (string) - Auto-updated by Postgres

**Status editing is intentionally removed from the UI** — do not re-add it.

### Resumes Table (My Profile / library)
Current valid columns:
- `id`, `user_id`, `title`, `content` (JSONB: `{ text: string, fileName?: string }`), `item_type`, `is_default`, `created_at`, `updated_at`
- `item_type` values: `'resume' | 'cover_letter' | 'portfolio' | 'other'`
- Only one item per user can have `is_default = true` (enforced by partial unique index)
- The default item is auto-loaded as primary background in the tailor page via `ExperiencePanel`

### User Profiles Table
Added in migration 012. Stores contact info extracted from uploaded resumes.
- `user_id` (string, PK) — Clerk user ID
- `full_name` (string | null)
- `email` (string | null)
- `location` (string | null)
- `linkedin_url` (string | null)
- `created_at`, `updated_at`

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
| `POST /api/generate-documents` | Edge | SSE stream — resume (+ optional cover letter); fetches `user_profiles` and injects contact info into prompt if `full_name`/`email` are set |
| `POST /api/fetch-job-posting` | Node | URL scrape — HTML extraction, company/title detection |
| `POST /api/parse-job-details` | Node | Haiku extraction of company + job title from pasted JD text |
| `POST /api/extract-resume` | Node | PDF/DOCX text extraction |
| `POST /api/download-pdf/[type]` | Node | PDF generation and download (`/resume`, `/cover-letter`, `/polished`); all three prefer `profile.full_name` over Clerk name for `candidateName` |
| `GET /api/resumes` | Node | List My Documents (default first, then created_at desc) |
| `POST /api/resumes` | Node | Save new document to library |
| `GET /api/applications/[id]` | Node | Fetch application content + candidateName for PDF preview |
| `DELETE /api/applications` | Node | Bulk delete by `ids` array |
| `DELETE /api/applications/[id]` | Node | Delete single resume record |
| `POST /api/interview-prep` | Node | Haiku — generates 8 interview questions across 6 categories; saves to `applications.interview_prep`; returns `InterviewPrep` |
| `POST /api/log-event` | Node | Server-side event logging — writes JSON to Vercel function logs; always returns 200 |
| `POST /api/resume-chat` | Node | Sonnet non-streaming — AI chat for refining a generated resume; parses `CHANGE:` vs `ANSWER:` response format; on change, updates `applications.resume_content` and `applications.chat_history` in Supabase |
| `POST /api/base-resume-chat` | Node | Sonnet non-streaming — AI chat for refining a polished resume draft; parses `CHANGE:` vs `ANSWER:`; does NOT save to DB (caller saves explicitly); returns `{ type, content }` |
| `POST /api/generate-polished-resume` | Node | Sonnet non-streaming — accepts `{ documentIds[], pageLimit, roleTypeHint? }`, builds standalone resume; fetches `user_profiles` and injects contact info into prompt; returns `{ resumeText: string }` |
| `GET /api/profile` | Node | Fetch `user_profiles` row for current user; returns empty defaults if not found |
| `PUT /api/profile` | Node | Upsert contact info (`full_name`, `email`, `location`, `linkedin_url`) for current user |
| `POST /api/extract-contact` | Node | Haiku call — extracts name/email/location/LinkedIn from first 800 chars of resume text; returns `{ full_name, email, location, linkedin_url }` |
| `POST /api/interview/generate` | Node | Sonnet non-streaming call — builds experience doc from interview transcript; returns `{ document: string }` |
| `GET /api/interview/sessions` | Node | Fetch most recent `draft` session for current user; returns `{ session }` (null if none) |
| `POST /api/interview/sessions` | Node | Create a new draft session; returns `{ id }` |
| `PATCH /api/interview/sessions/[id]` | Node | Update session state (`completed_roles`, `draft_state`, `status`) |
| `DELETE /api/interview/sessions/[id]` | Node | Delete session (on discard or after saving to My Documents) |

### generate-documents request fields
- `company`, `jobTitle`, `jobDescription`, `backgroundExperience` — required
- `jobUrl` — optional string, saved to `applications.job_url` if provided
- `isFromUploadedFile` — boolean, affects resume prompt framing
- `fitAnalysis` — pre-computed FitAnalysis (skips re-analysis)
- `includeCoverLetter` — boolean (default false)
- `includeSummary` — boolean (default false); when false the prompt instructs the AI to omit the SUMMARY section entirely
- `additionalContext` — array of `{ title, type, text }` from My Documents
- `questions` — optional `string[]` of application questions (max 5)
- `shortResponse` — boolean, if true answers are 2-3 sentences instead of paragraphs

### generate-documents SSE events (in order)
`status` → `resume_chunk` → `resume_done` → [`cover_letter_chunk` → `cover_letter_done`] → [`questions_done`] → `done`

### fetch-job-posting behavior
- Blocks `linkedin.com/jobs` URLs — returns `{ error, code: 'LINKEDIN_BLOCKED' }` with status 422
- Strips `<head>`, scripts, styles, nav, header, footer from HTML before text extraction
- Seeks to job title position in extracted text to skip nav/menu noise rendered as `<div>` elements
- Truncates at the **earliest-occurring** application form marker in the document (e.g. "Apply for this job", "Equal Employment Opportunity", "Legal first name", etc.)
- Backstop: removes trailing noise by finding the last substantive line (>25 chars)
- Detects company: `og:site_name` → title "at Company" pattern → Greenhouse/Lever/Workday URL patterns
- Detects job title: `og:title` (stripped) → `<title>` tag fallback
- Extracts open-ended application questions from the form section using Haiku (skips identity/demographic/compliance fields)
- Returns `{ jobDescription, company?, jobTitle?, detectedQuestions: string[] }`

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
- ApplicationList has a search bar at the top — filters by company or job title using `useMemo`
- `ApplicationItem` type exported from `app/dashboard/page.tsx`, imported by `ApplicationList`
- Multi-select bulk delete via checkboxes; single delete via trash icon on each card
- Data fetched server-side in `DashboardPage`, passed to `ApplicationList` as `initialItems`
- `ApplicationCard` shows a `Lightbulb` icon (yellow = active, slate = disabled) — active when `fit_analysis` is non-null, opens `FitAnalysisModal`
- `ApplicationCard` shows a `MessageSquare` icon if `question_answers` exist — opens a full-screen modal with Q&A list, word count per answer, and copy buttons
- `ApplicationCard` has Eye icon preview buttons alongside each download button — fetches application content via `GET /api/applications/[id]` on first click, caches for subsequent previews
- `ApplicationCard` shows a `Target` icon (primary color = prep exists, muted = not yet generated) — clicking triggers `POST /api/interview-prep` if null, then opens `InterviewPrepPanel` in a modal
- `ApplicationCard` shows a `ScrollText` icon — opens a modal with the formatted job description (`FormattedJD` component)
- `components/FitAnalysisModal.tsx` — reusable modal used on both home page (with `actions` slot for Generate/Start Over) and dashboard cards; handles Escape key, backdrop click, graceful fallback if data malformed; shows top 3 items per section by default with a chevron expand toggle; items are ranked most-impactful-first by the API prompt
- `components/InlinePDFViewer.tsx` — inline PDF iframe (US Letter aspect ratio) rendered via `BlobProvider`; shown post-generation replacing the textarea; "Edit text" toggle switches back; auto-updates when `resumeContent` prop changes; pass empty strings for `company`/`jobTitle` when used outside of a job application context
- `components/ResumeChatPanel.tsx` — post-generation resume chat; parses `CHANGE:` vs `ANSWER:` response format; "Fit to 1 page" and "Fit to 2 pages" quick-action chips; saves changes to `applications.resume_content` and `applications.chat_history`

## Resume Generation — Output Format

The EXPERIENCE section format is strict. **Dates go on the role line, never on the company line.**

```
[Company Name] | [City, State]
[Job Title] | [Start Month Year] – [End Month Year or Present]
• bullet
• bullet

[Next Job Title] | [Dates]        ← additional role at same company, no company repeat
• bullet

[Next Company] | [City, State]
[Job Title] | [Dates]
• bullet
```

The PDF parser (`lib/pdf/ResumePDF.tsx`) detects:
- **Company line**: `X | Y` where Y does **not** match `/(\d{4}|Present|Current)/i`
- **Role line**: `X | Y` where Y **does** match that pattern
- **Backward compat**: 3-part `Company | Location | Dates` is accepted; dates move to first role

## Resume Generation — Bullet Point Rules

These rules are baked into the generation prompt and must be preserved whenever the prompt is edited:

- **Bullet count by role seniority** — most recent/primary role 8–10; supporting roles 6–8; early career/less relevant roles 4–5. Aim for the higher end of each range — a well-written resume for a candidate with 4+ years of experience should fill 2 pages. Only combine bullets if truly redundant. Hard ceiling: 10 bullets per role.
- **Max 180 chars per bullet** — if it runs long, split into two bullets rather than wrapping to a third line
- **No repeated action verbs** — never use the same opening verb more than once within a single role's bullets. Scan all bullets for that role before writing. Synonyms: Built → Engineered, Developed, Created, Designed, Shipped, Delivered, Launched, Implemented, Deployed, Authored; Led → Managed, Directed, Oversaw, Guided, Mentored, Headed; Improved → Reduced, Increased, Accelerated, Optimized, Streamlined, Elevated, Boosted
- **No hedging on leadership** — words like "Informally", "Somewhat", "Partially", "Helped with", "Assisted in leading" undermine the candidate. If they led, they led. Reframe confidently: "Informally led a team" → "Managed a team of 2 engineers"; "Helped lead" → "Co-led" or just "Led"

## PDF Page Overflow Policy
2-page resumes are acceptable and normal for candidates with
4+ years of experience. The PDF template should never truncate
content to force single-page output. Spacing optimizations
should only target unnecessary whitespace — never content.

## PDF Preview

- `components/PDFPreviewModal.tsx` — `'use client'` component, uses `BlobProvider` from `@react-pdf/renderer` to generate a blob URL and display it in an `<iframe>`
- Always imported via `dynamic(() => import('@/components/PDFPreviewModal'), { ssr: false })` to avoid SSR issues with `@react-pdf/renderer`
- Home page: preview buttons next to download buttons; uses `useUser()` from Clerk for `candidateName`
- Dashboard: preview buttons on each card; content fetched lazily via `GET /api/applications/[id]`

---

## My Profile / ExperiencePanel

- `ExperiencePanel` (replaces old `ContextSelector`) — collapsible panel in the tailor form; fetches `/api/resumes`, auto-selects the default item as primary background doc; shows collapsed summary bar when loaded
- Collapsed state: shows primary doc name + additional doc count with "Edit▾" button
- Expanded state: primary doc dropdown, session-only upload (no save modal), additional context checkboxes, link to My Profile
- Warning state when no docs loaded (amber icon + "No experience loaded")
- `key={resetKey}` on `<ExperiencePanel>` in `app/tailor/page.tsx` — incrementing remounts and re-fetches
- Additional context items appear in both analyze-fit and generate-documents prompts with source attribution

---

## Theme

- Dark mode by default, toggled via `dark` class on `<html>`
- Preference stored in `localStorage` under key `'theme'` (`'dark'` or `'light'`)
- Inline script in `app/layout.tsx` applies preference before first paint (no flash)
- Toggle lives in the Navbar hamburger dropdown (not a standalone icon button)

---

## Home Page Routing (`/`)

The home page is a server component that detects user state and routes accordingly:

| State | Condition | Screen shown |
|-------|-----------|-------------|
| First-time user | No documents at all | `WelcomeScreen` — 3 onboarding paths |
| Returning user | Has ≥1 document | `GoalScreen` — 5 goal cards |
| Skip flag set | `resumeforge_skip_goal_screen = 'true'` in localStorage | Redirect to `/tailor` |

**`WelcomeScreen`** — Heading: "Let's build your Experience Library". Primary upload card (upload resume PDF/DOCX — extract → save as default `is_default: true` → contact confirmation form → `/tailor`). Collapsible "What else can I add?" tips panel. Negative path: "Don't have a resume? Let's make one with AI →" links to `/interview`. After first resume upload, calls `/api/extract-contact` to pre-fill a contact confirmation form (name, email, location, LinkedIn); user reviews/edits and saves → `PUT /api/profile` → redirects to `/tailor`; "Skip for now" bypasses without saving.

**`GoalScreen`** — 5 cards: Tailor Now (`/tailor`), Polished Resume (`/polished-resume`), Add More Experience (`/interview`), Prep for Interview (`/dashboard`, shown only if `hasApplications`), Manage My Documents (`/resumes`)

**`HomeRouter`** is a client component that reads localStorage and renders the right screen. Home page state is fetched server-side (documents + applications count from Supabase) on every visit.

**Generation form** lives at `/tailor` — protected by Clerk middleware. The logo link in the Navbar goes to `/` (goal screen), not `/tailor`.

---

## Onboarding Tour (`driver.js`)

- `components/TourGuide.tsx` — `'use client'` component; auto-starts the tour for first-time users; exports `startTour()` for replay
- localStorage key: `resumeforge_tour_completed` — `'true'` means tour has been seen; absence or any other value triggers auto-start
- Tour auto-starts 800ms after mount to allow the page to fully render
- Tour replay appears in the Navbar hamburger dropdown (as "Take the Tour") — only shown after the tour has been completed once
- Step 2 (Job Search) is **backlogged** — the job search feature is not yet implemented; tour skips from Welcome directly to Job Details
- Tour targets use `id` attributes on the `/tailor` page: `tour-heading`, `tour-job-details`, `tour-background`, `tour-context`, `tour-questions`, `tour-generate`, `tour-my-documents`
- `ContextSelector` shows a dashed empty-state callout with a link to `/resumes` when the user has no library documents; the callout also carries `id="tour-context"` so the tour step targets it regardless of whether documents exist
- **Tour only runs on `/tailor`** — the generation form page. It does not auto-start on `/` (the goal/welcome screen)
- Dark theme CSS override in `app/globals.css` under `.resumeforge-tour` class

## Navbar

- Hamburger menu (`Menu` icon) is visible on **all screen sizes** for signed-in users — no always-visible nav links on desktop
- Hamburger dropdown contains: Tailor New Resume (`/tailor`), AI Resumes (`/dashboard`), My Profile (`/resumes`), divider, Take the Tour, Light/Dark Mode toggle, divider, Feedback
- Signed-out users see a persistent Sun/Moon toggle + Sign In button (no hamburger)
- `FeedbackModal` is `dynamic` imported with `ssr: false` in both `Navbar.tsx` and `Footer.tsx`
- **Logo link bug fix**: Logo uses `<a href="/">` (plain anchor) instead of Next.js `<Link href="/">` — forces a full page reload so the router cache does not serve a stale "no documents" WelcomeScreen to returning users

## Footer

- `components/Footer.tsx` — rendered in `app/layout.tsx` for all pages
- Shows "Built by Bobby Langley" attribution (left) and a Feedback button (right)
- `body` in `layout.tsx` uses `flex flex-col min-h-screen` so footer sticks to bottom

---

## Polished Resume (`/polished-resume`)

- **`PolishedResumeCreator`** — 4-step flow:
  1. **Select** — checkbox list of user's documents; pre-selects `resume` + `other` types
  2. **Configure** — page limit radio (1/2/custom, max 4) + optional role type hint
  3. **Generate** — animated progress; calls `POST /api/generate-polished-resume`
  4. **Review** — `InlinePDFViewer` + "Edit text" textarea toggle + AI chat panel (quick chips + free-form input using `POST /api/base-resume-chat`)
- Save options: "Save to My Documents" (`item_type: 'resume'`), "Set as default document" (`is_default: true`), "Just download" via `POST /api/download-pdf/polished`
- Diamond icon as visual marker throughout

---

## User Profile / Contact Info

Contact info is stored in `user_profiles` (one row per user, upserted — not inserted) and surfaced in two places:

**First-time user flow (WelcomeScreen)**
- After first resume upload, `POST /api/extract-contact` is called with the first 800 chars of extracted text
- Returns `{ full_name, email, location, linkedin_url }` — a pre-filled form is shown for the user to review/edit
- "Save" → `PUT /api/profile` → redirect to `/tailor`; "Skip for now" bypasses without saving

**My Profile page (`/resumes`) — Contact Information section**
- Collapsed by default; header shows name + email as a summary
- Click chevron to expand and edit all 4 fields
- Server-side: if `user_profiles` is empty for the user, `inferContactFromDocs` runs over the two most recent uploaded documents to pre-fill the form (merges fields across docs, first non-empty value wins)

**Shared helper — `lib/extract-contact.ts`**
- `extractContactFields(text: string)` — calls Haiku, returns `{ full_name, email, location, linkedin_url }`
- `inferContactFromDocs(docs, maxDocs = 2)` — iterates docs, calls `extractContactFields` on each, merges results; used by `resumes/page.tsx` server-side pre-fill
- Used by both `POST /api/extract-contact` and `resumes/page.tsx` — do not duplicate this logic elsewhere

**Document generation**
- `generate-documents` and `generate-polished-resume` routes both fetch `user_profiles` for the current user; if `full_name` and `email` exist, an exact contact info block is injected into the generation prompt so the AI uses the saved details verbatim
- All three download-pdf routes (`/resume`, `/cover-letter`, `/polished`) prefer `profile.full_name` over Clerk's display name for `candidateName`

---

## Branch Naming

All feature/fix branches: `claude/issue-{number}-{YYYYMMDD}-{HHMM}` — Vercel skips deployment on non-main branches.

---

## Development Guidelines

- Read TYPES.md before any database changes
- Run `npx tsc --noEmit` before committing — all PRs must be type-clean
- Use `gh issue comment` to post progress updates on GitHub issues
- Dev mode: `[Dev] Fill Test Data` button on the tailor page (`/tailor`) pre-fills sample job + resume data
- **After every feature: update CLAUDE.md, README.md, TYPES.md, post GitHub issue comment, close the issue** — see Definition of Done at the top of this file

## AI Experience Interview (`/interview`)

- `app/interview/page.tsx` — server wrapper (auth guard), renders `InterviewClient`
- `app/interview/InterviewClient.tsx` — full client state machine with steps: `preloading → draft-prompt? → doc-prompt? → intro → role-setup → researching → research-confirm → interview → complete → generating → output`
- **Pre-population:** on mount fetches `/api/resumes` + `/api/interview/sessions` in parallel; if docs found, shows prompt to use them as AI context; if a draft session exists, shows resume prompt instead
- **Company research:** after role setup, calls `POST /api/interview/research` (Haiku) for a company + role summary; user confirms or clarifies before interview starts
- **Adaptive chat:** each turn calls `POST /api/interview/chat` (Sonnet) with full history + system context; Claude decides what to ask next
- **Thinking indicator:** animated dots between user message and AI response
- **CHOICES: parsing:** Claude ends messages with `CHOICES: A | B | C`; UI renders as quick-reply pill buttons; "Move to next role" choice triggers role completion
- "Skip role" also available at any time
- **Session persistence:** draft auto-saved to `interview_sessions` table after each role completes + on "Save & exit"; deleted on discard or after saving to My Documents; enables cross-device resume (mobile ↔ browser)
- On complete, calls `POST /api/interview/generate` with full chat history per role → renders doc in preview pane
- "Save to My Documents" → `POST /api/resumes` with `item_type: 'other'`, then deletes session, redirects to `/resumes`
- "Copy to clipboard" copies raw text
- Linked from My Documents page header; also add link from TipsPanel "Expanded Work History" tip once issue #69 is merged

### Interview API routes
| Route | Purpose |
|-------|---------|
| `POST /api/interview/research` | Haiku — 3–5 sentence company + role summary; returns `{ summary: string }` |
| `POST /api/interview/chat` | Sonnet — single adaptive chat turn; returns `{ response: string }` |
| `POST /api/interview/generate` | Sonnet — builds formatted experience doc from full chat transcript; returns `{ document: string }` |
| `POST /api/interview/extract-roles` | Haiku — extracts up to 5 roles from document text, newest first; returns `{ roles: ExtractedRole[] }`. **Note:** Haiku wraps JSON in markdown fences despite instructions — always regex-strip fences and use `match(/\[[\s\S]*\]/)` before parsing |
