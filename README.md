# ResumeForge

AI-powered resume and cover letter generator that tailors your documents to specific job postings. Paste a job description (or import it from a URL), provide your background, and ResumeForge analyzes your fit, surfaces gaps, and generates a polished, targeted resume — and optionally a cover letter — in seconds.

---

## What It Does

### 0. Intelligent Home Page Routing
The home page (`/`) detects where the user is in their journey and routes them to the right screen:
- **First-time users** (no documents) → **Welcome screen**: choose to upload a resume, build with AI, or paste manually; each path saves to the profile and redirects to `/tailor`
- **Returning users** → **Goal screen**: 5 options (Tailor Now, Update Base Resume, Add Experience, Prep for Interview, View Applications); smart banners warn when no base resume is set or the base resume is stale (>30 days)
- **Power users** can click "Skip to generation" to go straight to `/tailor` on every visit (stored in `localStorage`)
- The generation form lives at `/tailor` — protected by Clerk middleware

### 1. Job Fit Analysis
Before generating anything, ResumeForge runs a fit analysis using Claude Haiku:
- Rates overall fit: **Strong Fit**, **Good Fit**, or **Stretch Role**
- Lists specific strengths, gaps, and suggestions — each attributed to the source artifact they came from
- Generates 3–5 **Planned Improvements**: concrete changes that will be made to the resume (e.g. "surface the 50% ticket resolution metric", "add missing keyword: GraphQL")
- Detects role type (technical, management, sales, customer success, research) to tailor the analysis tone
- Fit analysis is **saved with each application** and viewable any time from the AI Resumes dashboard via a lightbulb icon on each card
- Results are **ranked by importance** — most impactful items appear first in each section
- Each section shows the **top 3 items by default** with a chevron toggle to expand and see all

### 2. Document Generation
After reviewing the fit analysis, the user approves generation. Claude Sonnet streams back:
- A fully tailored resume formatted for the specific role and company
- An optional **summary section** (toggled before submission — off by default)
- An optional **cover letter** (toggled before submission)
- Both stream live to the page as they generate; once complete, panels switch to an **inline PDF view** (US Letter aspect ratio iframe) — an "Edit text" toggle switches back to the raw textarea
- The PDF view auto-updates when resume content is modified via AI chat
- If application questions are provided, a third phase generates written answers grounded in the resume and background — displayed with word counts and copy buttons
- A **"Start Fresh"** button resets the form after generation

### 2a. Post-Generation Resume Chat
After a resume is generated, a chat panel lets users refine it conversationally:
- Ask Claude to rewrite a bullet, change tone, trim to one page, add a skill, etc.
- Claude responds with either a `CHANGE:` (updated resume content applied immediately) or `ANSWER:` (plain text reply shown in chat)
- **Page fit quick actions** — "Fit to 1 page" and "Fit to 2 pages" chips send a one-click prompt; Claude trims or expands accordingly without suggesting external tools
- Changes are saved to `applications.resume_content` in Supabase; chat history saved to `applications.chat_history`
- The inline PDF view updates automatically as changes are applied

### 2c. Resume Bullet Point Rules
The generation prompt enforces strict quality rules:
- **Tiered bullet counts** — most recent/primary role 8–10 bullets; supporting roles 6–8; early career/less relevant roles 4–5; hard ceiling of 10 per role; aim for the higher end — a candidate with 4+ years of experience should fill 2 pages
- **180-character max per bullet** — long bullets are split rather than wrapped
- **No repeated action verbs** — each bullet within a role must open with a unique verb
- **No hedging on leadership** — "Informally led" becomes "Managed", "Helped lead" becomes "Co-led"

### 2d. Application Questions
Users can add up to 5 open-ended application questions before generating:
- Questions can be entered manually or auto-populated from URL import
- Toggle between short responses (2–3 sentences) and full paragraphs
- AI-generated answers are shown after generation with word count and one-click copy
- Answers are saved and viewable from the AI Resumes dashboard via a chat icon modal

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

### 4. Base Resume
A single master resume that serves as the foundation for all tailored applications:
- AI-generated from the user's uploaded documents using Claude Sonnet — comprehensive, full-detail, not filtered for any specific role
- **Creation flow** at `/base-resume`: select source documents → animated generation → review with inline PDF preview and AI chat refinement → save
- **AI chat refinement** — same CHANGE/ANSWER format as post-generation chat; changes held in state until explicit save
- **Edit & Refine** — accessible from My Profile; loads existing base resume into review step at `/base-resume?id=<id>`
- **Auto-loads in tailor form** — when a base resume exists, it automatically populates the background field on `/tailor` with a "Using base resume" badge; clears when user switches to another document
- Stored in the `resumes` table with `item_type: 'base_resume'` and `is_default: true`; never shown in ContextSelector or document list

### 5. My Profile (Document Library)
A personal library of saved context artifacts:
- Upload PDF or DOCX files — text is extracted server-side
- **Save to profile prompt** — when uploading a file on the welcome screen, it's saved as the default document
- Categorize items: Resume, Cover Letter, Portfolio, Other (base resume is managed separately)
- Mark one item as **Default** — it auto-loads as the primary background on `/tailor`; if no item is marked default, the first document is used automatically
- **All** non-default items are pre-selected as **additional context** for the AI, with the accordion expanded automatically
- Additional context items are appended to both the fit analysis and generation prompts, with source attribution on every insight

### 6. AI Resumes Dashboard
Saves every generated resume to Supabase:
- Card view with company, job title, and date
- **Search bar** at the top — filter cards by company or job title in real time
- **Target icon** — generates and displays AI interview prep (8 tailored questions with hints, resume references, and practiced tracking); opens immediately with skeleton loading UI while generating; saved to Supabase for future visits
- **ScrollText icon** — opens a formatted job description modal with smart paragraph/bullet detection
- **Lightbulb icon** (yellow = insights available, slate = none) — opens the Fit Analysis modal showing strengths, gaps, suggestions, and planned improvements from when the resume was generated
- Download resume or cover letter as PDF
- Eye icon next to each download button opens a **preview modal**
- If the record has application question answers, a chat icon opens a modal showing each Q&A with word count and copy button
- Multi-select checkboxes for bulk delete; trash icon for individual delete
- **"← Back to resume generator"** link at the top for easy navigation

### 7. PDF Downloads & Preview
Generated documents can be downloaded as formatted PDFs directly from the dashboard or immediately after generation:
- Eye icon next to each download button opens a **preview modal** — rendered client-side using `@react-pdf/renderer`'s `BlobProvider` in an iframe
- PDF experience format: company + location on one line, each role title + dates on the next line, bullets below — dates never appear on the company line
- 2-page resumes are acceptable and normal for 4+ years of experience — content is never truncated to force single-page output

### 8. First-Time Onboarding Tour
A guided walkthrough for new users powered by `driver.js`:
- Auto-starts 800ms after first sign-in (tracked via `localStorage`)
- 7 steps: Welcome → Job Details → Your Background → Context Documents → Application Questions → Generate → Navigation
- Each step has a **pulsing blue ring** on the highlighted element and a **bouncing arrow** pointing at the specific field within the section
- Dismissable at any step; completing or dismissing sets the `resumeforge_tour_completed` flag
- Tour replay available in the hamburger nav menu (Compass icon) after the tour has been completed once
- Styled to match the app's dark theme via custom CSS overrides in `globals.css`

### 9. AI Experience Interview (`/interview`)
An AI-guided career interview that builds a detailed experience document from the user's work history:
- **Role checklist** — extracts companies, titles, and date ranges from existing My Documents library via Haiku; user selects which roles to cover (most recent first) and can add custom roles not in their documents
- **Company research** — after each role is set up, Haiku generates a 3–5 sentence company + role summary; user confirms accuracy or clarifies before the interview starts
- **Adaptive AI conversation** — each turn calls Claude Sonnet with the full chat history and system context; Claude decides what to ask next rather than following a fixed script
- **Quick-reply choices** — Claude ends messages with `CHOICES: A | B | C`; UI parses and renders these as pill buttons; "Move to next role" triggers role completion
- **Cross-device draft persistence** — draft auto-saves to Supabase `interview_sessions` table after each role completes and on "Save & exit"; user can resume on any device (mobile or desktop)
- **Output** — generates a detailed, formatted experience document via Sonnet; user names and saves it to My Documents or copies to clipboard
- Accessible from the My Documents page header ("Build experience doc →" with Beta badge)

### 10. Feedback
Users can submit feedback or bug reports at any time:
- **Hamburger menu** — feedback option in the nav dropdown on all screen sizes
- **Footer** — persistent feedback button at the bottom of every page
- Two types: General and Bug Report
- Submissions are saved to Supabase `feedback` table

### 11. Interview Prep
After a resume is generated (or from the AI Resumes dashboard), users can generate tailored interview prep:
- **8 AI-generated questions** across 6 categories: Technical (2), Behavioral (2), Motivation (1), Background (1), Situational (1), Curveball (1)
- Each question includes **2–3 answer hints** grounded in the actual resume content and a **resume reference** (direct quote from the generated resume)
- **Skeleton loading UI** — modal opens immediately with 8 animated placeholder cards while Haiku generates, so users get instant feedback
- **Practiced tracking** — toggle each question as practiced; state persists in `localStorage` keyed by `applicationId`
- **Regenerate** — one-click regeneration of a fresh question set
- Category badges are color-coded: Technical=blue, Behavioral=purple, Motivation=green, Background=slate, Situational=orange, Curveball=red
- Available on the home page post-generation via a collapsible "Interview Prep" section, and on each card in the AI Resumes dashboard via the Target icon
- Questions are saved to `applications.interview_prep` (JSONB) and loaded lazily to avoid breaking the dashboard if the migration hasn't run

### 12. Versioning
ResumeForge uses a CalVer-style version format: `{Major}.{YY}{M}.{DD}{H}` — e.g. `1.263.259` for version 1, March 2026, 25th day, 9am.
- Version is computed at **build time** in `next.config.mjs` from the major version in `package.json` and the current date/time
- Injected as `NEXT_PUBLIC_APP_VERSION` environment variable
- Displayed in the Footer at 40% opacity
- Major version bumps are manual (update `package.json`); minor/patch auto-update on every deploy

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
- **Pre-generation** — Resume generation begins 500ms after the user sees the fit analysis results, running in the background via refs (never touching state). When the user clicks "Generate", if generation is already complete the result appears instantly; if still running, it streams into the UI in real time.
- **Fit analysis first** — Generation is always gated behind a fit review modal, so users see what the AI plans to change before committing. Fit analysis is saved with the application and accessible from the dashboard.
- **Dark mode default** — Theme is toggled via a `dark` class on `<html>`, defaulting to dark. Preference persists in `localStorage`. An inline script in `layout.tsx` prevents flash of wrong theme on load. Theme toggle lives in the hamburger nav menu.
- **Hamburger-only nav** — All navigation (Tailor New Resume, AI Resumes, My Documents) lives in the hamburger dropdown on all screen sizes. No always-visible nav links on desktop.

---

## Project Structure

```
app/
  page.tsx                  # Home (/) — server component; detects user state, renders HomeRouter
  layout.tsx                # Root layout with Clerk provider, theme script, and Footer
  globals.css               # CSS variables for light/dark themes + driver.js tour overrides
  tailor/
    page.tsx                # Generation form (/tailor) — fit analysis + resume generation flow
  base-resume/
    page.tsx                # Base resume (/base-resume) — server wrapper; passes docs to BaseResumeCreator
  dashboard/
    page.tsx                # AI Resumes dashboard (server component)
    ApplicationList.tsx     # Client component — multi-select, delete
    ApplicationCard.tsx     # Resume card — download, preview, Q&A modal, fit analysis lightbulb
    loading.tsx             # Skeleton UI for Suspense boundary
  resumes/
    page.tsx                # My Profile page (server component) — splits base_resume from other docs
    ResumeLibrary.tsx       # Client component — base resume section at top, context documents below
    loading.tsx             # Skeleton UI
  interview/
    page.tsx                # Server wrapper — auth guard, renders InterviewClient
    InterviewClient.tsx     # Full adaptive interview state machine (10 steps)
  api/
    analyze-fit/            # POST — Haiku fit analysis, returns FitAnalysis JSON
    generate-documents/     # POST — Sonnet streaming SSE (Edge runtime) + optional question answers
    generate-base-resume/   # POST — Sonnet non-streaming; accepts documentIds[], returns { resumeText }
    base-resume-chat/       # POST — Sonnet CHANGE/ANSWER for base resume refinement; no DB writes
    fetch-job-posting/      # POST — URL scrape, HTML extraction, company/title/question detection
    parse-job-details/      # POST — Haiku extraction of company + job title from pasted JD text
    extract-resume/         # POST — PDF/DOCX text extraction
    download-pdf/[type]/    # POST — PDF generation and download
    resumes/                # GET/POST — My Profile CRUD (all item_types including base_resume)
    applications/           # DELETE bulk
    applications/[id]/      # GET single (for PDF preview) + DELETE single
    feedback/               # POST — save feedback to Supabase
    interview-prep/         # POST — Haiku generates 8 interview questions; saves to applications.interview_prep
    log-event/              # POST — Server-side analytics logging (Vercel function logs)
    interview/
      research/             # POST — Haiku company + role summary
      chat/                 # POST — Sonnet adaptive chat turn
      generate/             # POST — Sonnet experience document generation
      extract-roles/        # POST — Haiku role extraction from uploaded documents
      sessions/             # GET/POST — draft session management
      sessions/[id]/        # PATCH/DELETE — update or delete a session

components/
  Navbar.tsx                # Hamburger nav — Tailor New Resume→/tailor, AI Resumes→/dashboard, My Profile→/resumes
  Footer.tsx                # Persistent footer — attribution + feedback shortcut
  HomeRouter.tsx            # Client — localStorage skip flag check; renders WelcomeScreen or GoalScreen
  WelcomeScreen.tsx         # First-time user — 3 onboarding paths; saves to library, redirects to /tailor
  GoalScreen.tsx            # Returning user — 5 goal cards + state banners + skip link
  ContextSelector.tsx       # Library picker — filters out base_resume; primary background + additional context
  FitAnalysisModal.tsx      # Reusable fit analysis modal — top 3 per section, expandable; /tailor and dashboard
  InlinePDFViewer.tsx       # Inline PDF iframe; used post-generation and in BaseResumeCreator
  ResumeChatPanel.tsx       # Post-generation chat UI — page fit chips, CHANGE/ANSWER, saves to applications table
  BaseResumeCreator.tsx     # 3-step base resume flow; inline PDF + AI chat; saves to resumes table
  FeedbackModal.tsx         # Feedback form modal — general and bug report types
  PDFPreviewModal.tsx       # PDF preview modal — BlobProvider iframe, dynamically imported (ssr: false)
  TourGuide.tsx             # driver.js onboarding tour (targets /tailor elements); exports startTour() for replay
  InterviewPrepPanel.tsx    # Interview prep UI — QuestionCard, SkeletonQuestionCard, InterviewPrepSection

lib/
  supabase.ts               # Singleton Supabase client (service role)
  models.ts                 # Cached model ID fetcher with fallback
  pipeline-utils.ts         # Shared SSE helpers, JSON parser, context block builder

types/
  fit-analysis.ts           # FitAnalysis, FitPoint, OverallFit, RoleType
  resume.ts                 # ResumeItem, ItemType, ITEM_TYPE_LABELS
  database.ts               # Full Supabase Database interface (users, resumes, applications, interview_sessions, feedback)
  interview-prep.ts         # InterviewPrep, InterviewQuestion, InterviewQuestionCategory, InterviewPrepRequest

supabase/migrations/        # SQL migration files (001–010)

.env.local.example          # All required environment variables with comments
```

---

## Environment Variables

See `.env.local.example` for the full list. Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=   # Service role key (not anon)
ANTHROPIC_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Optional (for email delivery of feedback submissions):
```env
RESEND_API_KEY=
FEEDBACK_EMAIL=
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
