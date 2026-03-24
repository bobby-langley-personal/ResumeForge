# ResumeForge

AI-powered resume and cover letter generator that tailors your documents to specific job postings. Paste a job description (or import it from a URL), provide your background, and ResumeForge analyzes your fit, surfaces gaps, and generates a polished, targeted resume — and optionally a cover letter — in seconds.

---

## What It Does

### 1. Job Fit Analysis
Before generating anything, ResumeForge runs a fit analysis using Claude Haiku:
- Rates overall fit: **Strong Fit**, **Good Fit**, or **Stretch Role**
- Lists specific strengths, gaps, and suggestions — each attributed to the source artifact they came from
- Generates 3–5 **Planned Improvements**: concrete changes that will be made to the resume (e.g. "surface the 50% ticket resolution metric", "add missing keyword: GraphQL")
- Detects role type (technical, management, sales, customer success, research) to tailor the analysis tone

### 2. Document Generation
After reviewing the fit analysis, the user approves generation. Claude Sonnet streams back:
- A fully tailored resume formatted for the specific role and company
- An optional cover letter (toggled before submission)
- Both stream live to the page as they generate
- If application questions are provided, a third phase generates written answers grounded in the resume and background — displayed with word counts and copy buttons

### 2a. Application Questions
Users can add up to 5 open-ended application questions before generating:
- Questions can be entered manually or auto-populated from URL import
- Toggle between short responses (2–3 sentences) and full paragraphs
- AI-generated answers are shown after generation with word count and one-click copy
- Answers are saved and viewable from the AI Resumes dashboard via a modal

### 3. Job URL Auto-Import
Users can paste a job posting URL instead of copying text manually:
- Server-side page fetch with HTML stripping (scripts, nav, footer, forms, `<head>`)
- Seeks to where the job title appears in text to skip nav/menu noise in `<div>` elements
- Truncates at the earliest-occurring application form marker in the document
- Backstop cleanup removes short trailing lines
- Auto-detects company name from `og:site_name`, title patterns, and job board URLs (Greenhouse, Lever, Workday)
- Auto-detects job title from `og:title`
- Auto-extracts open-ended application questions from the form section (skips demographic/identity fields) — these pre-populate the Application Questions panel
- LinkedIn URLs are blocked with a helpful inline message

### 4. My Documents (Resume Library)
A personal library of saved context artifacts:
- Upload PDF or DOCX files — text is extracted server-side
- Categorize items: Resume, Cover Letter, Portfolio, Other
- Mark one item as **Default** — it auto-loads as the primary background on the home page
- The 3 most recent non-default items are pre-selected as **additional context** for the AI, expanding the accordion automatically
- Additional context items are appended to both the fit analysis and generation prompts, with source attribution on every insight

### 5. AI Resumes Dashboard
Saves every generated resume to Supabase:
- Card view with company, job title, and date
- Download resume or cover letter as PDF
- If the record has application question answers, a chat icon opens a modal showing each Q&A with word count and copy button
- Multi-select checkboxes for bulk delete
- Single-card trash icon for individual delete

### 6. PDF Downloads & Preview
Generated documents can be downloaded as formatted PDFs directly from the dashboard or immediately after generation. An Eye icon next to each download button opens a preview modal — rendered client-side using `@react-pdf/renderer`'s `BlobProvider` in an iframe — so you can review formatting before saving.

### 7. First-Time Onboarding Tour
A guided walkthrough for new users powered by `driver.js`:
- Auto-starts 800ms after first sign-in (tracked via `localStorage`)
- 6 steps: Welcome → Job Details → Your Background → Context Documents → Application Questions → Generate
- Dismissable at any step; completing or dismissing sets the `resumeforge_tour_completed` flag
- "? Tour" replay button appears in the navbar after the tour has been seen at least once
- Styled to match the app's dark theme via custom CSS overrides in `globals.css`

### 8. AI Experience Interview (`/interview`)
An AI-guided career interview that builds a detailed experience document from the user's work history:
- **Role checklist** — extracts companies, titles, and date ranges from existing My Documents library via Haiku; user selects which roles to cover (most recent first) and can add custom roles not in their documents
- **Company research** — after each role is set up, Haiku generates a 3–5 sentence company + role summary; user confirms accuracy or clarifies before the interview starts
- **Adaptive AI conversation** — each turn calls Claude Sonnet with the full chat history and system context; Claude decides what to ask next rather than following a fixed script
- **Quick-reply choices** — Claude ends messages with `CHOICES: A | B | C`; UI parses and renders these as pill buttons; "Move to next role" triggers role completion
- **Role revisit** — complete screen shows each finished role with a button to go back and continue the conversation
- **Cross-device draft persistence** — draft auto-saves to Supabase `interview_sessions` table after each role completes and on "Save & exit"; user can resume on any device (mobile or desktop)
- **Output** — generates a detailed, formatted experience document via Sonnet; user names and saves it to My Documents or copies to clipboard
- Accessible from the My Documents page header ("Build experience doc →" with Beta badge)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | Supabase (Postgres, service role key) |
| AI | Anthropic Claude (Haiku for analysis, Sonnet for generation) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Key Architecture Decisions

- **No RLS** — Clerk and Supabase Auth are separate systems. The service role key is used and every query manually filters by `user_id`.
- **Supabase singleton** — `supabaseServer()` returns a module-level singleton to avoid connection exhaustion on Vercel's serverless functions.
- **Model cache** — `getModels()` caches Anthropic model IDs in memory for 1 hour with a hardcoded fallback, avoiding repeated API calls on every request.
- **SSE streaming** — Document generation uses Server-Sent Events via the Edge runtime so the resume streams word-by-word to the UI.
- **Fit analysis first** — Generation is always gated behind a fit review modal, so users see what the AI plans to change before committing.
- **Dark mode default** — Theme is toggled via a `dark` class on `<html>`, defaulting to dark. Preference persists in `localStorage`. An inline script in `layout.tsx` prevents flash of wrong theme on load.

---

## Project Structure

```
app/
  page.tsx                  # Home — job input form, fit analysis modal, generation flow
  layout.tsx                # Root layout with Clerk provider and theme script
  globals.css               # CSS variables for light/dark themes + driver.js tour overrides
  dashboard/
    page.tsx                # AI Resumes dashboard (server component)
    ApplicationList.tsx     # Client component — multi-select, delete
    ApplicationCard.tsx     # Individual resume card with download + Q&A modal
    loading.tsx             # Skeleton UI for Suspense boundary
  resumes/
    page.tsx                # My Documents library page (server component)
    ResumeLibrary.tsx       # Client component — upload, edit, set default
    loading.tsx             # Skeleton UI
  interview/
    page.tsx                # Server wrapper — auth guard, renders InterviewClient
    InterviewClient.tsx     # Full adaptive interview state machine (10 steps)
  api/
    analyze-fit/            # POST — Haiku fit analysis, returns FitAnalysis JSON
    generate-documents/     # POST — Sonnet streaming SSE (Edge runtime) + optional question answers
    fetch-job-posting/      # POST — URL scrape, HTML extraction, company/title/question detection
    parse-job-details/      # POST — Haiku extraction of company + job title from pasted JD text
    extract-resume/         # POST — PDF/DOCX text extraction
    download-pdf/[type]/    # POST — PDF generation and download
    resumes/                # GET/POST — My Documents CRUD
    applications/           # DELETE bulk
    applications/[id]/      # GET single (for PDF preview) + DELETE single
    interview/
      research/             # POST — Haiku company + role summary
      chat/                 # POST — Sonnet adaptive chat turn
      generate/             # POST — Sonnet experience document generation
      extract-roles/        # POST — Haiku role extraction from uploaded documents
      sessions/             # GET/POST — draft session management
      sessions/[id]/        # PATCH/DELETE — update or delete a session

components/
  Navbar.tsx                # Nav with theme toggle, mobile hamburger menu, signed-in links
  ContextSelector.tsx       # Library picker — primary background + additional context
  PDFPreviewModal.tsx       # PDF preview modal — BlobProvider iframe, dynamically imported (ssr: false)
  TourGuide.tsx             # driver.js onboarding tour; exports startTour() for replay

lib/
  supabase.ts               # Singleton Supabase client (service role)
  models.ts                 # Cached model ID fetcher with fallback
  pipeline-utils.ts         # Shared SSE helpers, JSON parser, context block builder

types/
  fit-analysis.ts           # FitAnalysis, FitPoint, OverallFit, RoleType
  resume.ts                 # ResumeItem, ItemType, ITEM_TYPE_LABELS
  database.ts               # Full Supabase Database interface (users, resumes, applications, interview_sessions)

supabase/migrations/        # SQL migration files (001–008)
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=   # Service role key (not anon)
ANTHROPIC_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The `[Dev] Fill Test Data` button on the home page pre-fills a sample job description and resume for quick testing.

---

## Branch Naming

Feature branches follow `claude/issue-{number}-{YYYYMMDD}-{HHMM}` so Vercel skips automatic deployment on non-main branches.
