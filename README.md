# Easy Apply AI

AI-powered resume and cover letter generator that tailors your documents to specific job postings. Paste a job description (or import it from a URL), provide your background, and Easy Apply analyzes your fit, surfaces gaps, and generates a polished, targeted resume — and optionally a cover letter — in seconds.

> **Branding note:** The GitHub repo is named `ResumeForge` (legacy name). The product is **Easy Apply AI**. All user-facing text uses "Easy Apply" / "Easy Apply AI". The Chrome extension is published on the Chrome Web Store as "Easy Apply".

---

## Landing Page

The signed-out landing page (`/`) is a full marketing page with:
- **Navbar** — brand logo with `AI` superscript, "Chrome Extension OTW" amber badge (scrolls to extension section), Sign In, Get Started Free
- **Hero** — "Land more interviews. Faster." with dual CTA (Get Started Free / Sign In)
- **Features** — AI-Tailored Resumes, Cover Letter Generator, Fit Analysis
- **Experience Library** — AI Experience Interview (dark card), Experience Library, Polished Resume Builder (2-column grid)
- **Not-job-seeker callout** — captures the "update your CV while employed" use case
- **Template Myth** — "Your template doesn't get you the job. Your content does." — old-way vs Easy Apply way comparison
- **How it works** — 3-step flow
- **Chrome Extension** — "One click from any job board" with coming-soon banner + tab scraping callout, trust/control callouts
- **CTA Strip** — blue band, "Get Started Free"

---

## What It Does

### 1. Job Fit Analysis
Before generating anything, Easy Apply runs a fit analysis using Claude Haiku:
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
- **"Tailor New Resume"** button resets the form after generation — shown in a top action bar and at the bottom of the page alongside download buttons

### 2a. Post-Generation Resume Chat
After a resume is generated, a chat panel lets users refine it conversationally:
- Ask Claude to rewrite a bullet, change tone, trim to one page, add a skill, etc.
- Claude responds with either a `CHANGE:` (updated resume content applied immediately) or `ANSWER:` (plain text reply shown in chat)
- **Page fit quick actions** — "Fit to 1 page" and "Fit to 2 pages" chips send a one-click prompt; Claude trims or expands accordingly without suggesting external tools
- Changes are saved to `applications.resume_content` in Supabase; chat history saved to `applications.chat_history`
- The inline PDF view updates automatically as changes are applied; **Undo last change** restores the previous resume version and the PDF re-renders cleanly

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
- **Paste extraction** — pasting a job description also triggers company/title/question extraction via Haiku; questions auto-populate the Application Questions panel
- LinkedIn URLs are blocked with a helpful inline message

### 4. Polished General-Use Resume (`/polished-resume`)
Create a standalone, polished resume from your uploaded documents — not tailored to a specific job:
- **4-step flow**: select source documents → configure page limit (1–4 pages) + optional role type hint → generate → review
- AI synthesizes a clean, recruiter-ready resume from all selected documents
- Review with **inline PDF preview**, "Edit text" textarea toggle, and AI chat refinement
- Save to My Experience, set as default, or just download the PDF

### 5. My Experience (Resume Library — `/resumes`)
A personal library of saved context artifacts:
- Upload PDF or DOCX files — **drag and drop** or click to browse; text is extracted server-side
- **Save to profile prompt** — when uploading a file on the home page, a modal asks if you'd like to save it to My Experience so it auto-loads next time
- Categorize items: Resume, Cover Letter, Portfolio, Other
- Mark one item as **Default** — it auto-loads as the primary background on the home page; if no item is marked default, the first document is used automatically
- **All** non-default items are pre-selected as **additional context** for the AI, with the accordion expanded automatically
- Additional context items are appended to both the fit analysis and generation prompts, with source attribution on every insight

### 6. User Profile / Contact Info
Easy Apply extracts and stores your contact information so it is consistently applied across all generated documents:
- **Auto-extraction on first upload** — after uploading your first resume, Claude Haiku scans the text and pre-fills a contact confirmation form (name, email, location, LinkedIn URL); review, edit, and save in one click, or skip
- **Contact Information section on My Experience** — collapsed by default showing your name and email; click the chevron to expand and edit all 4 fields at any time
- **Smart pre-fill on My Experience** — if no profile is saved yet, the page runs contact extraction over your two most recent uploaded documents server-side and merges the results as a starting point
- **Injected into every generation** — when `full_name` and `email` are set, the resume generation and polished resume routes inject an exact contact block into the AI prompt so your details appear correctly in every output
- **PDF downloads** — all download routes use your saved name (`full_name`) in preference to the Clerk display name

### 7. AI Resumes Dashboard
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

### 8. PDF Downloads & Preview
Generated documents can be downloaded as formatted PDFs directly from the dashboard or immediately after generation:
- Eye icon next to each download button opens a **preview modal** — rendered client-side using `@react-pdf/renderer`'s `BlobProvider` in an iframe
- PDF experience format: company + location on one line, each role title + dates on the next line, bullets below — dates never appear on the company line
- 2-page resumes are acceptable and normal for 4+ years of experience — content is never truncated to force single-page output

### 9. First-Time Onboarding Tour
A guided walkthrough for new users powered by `driver.js`:
- Auto-starts 800ms after first sign-in (tracked via `localStorage`)
- 7 steps: Welcome → Job Details → Your Background → Context Documents → Application Questions → Generate → Navigation
- Each step has a **pulsing blue ring** on the highlighted element and a **bouncing arrow** pointing at the specific field within the section
- Dismissable at any step; completing or dismissing sets the `resumeforge_tour_completed` flag in localStorage
- Tour replay available in the hamburger nav menu (Compass icon) after the tour has been completed once
- Styled to match the app's dark theme via `.easy-apply-tour` CSS class overrides in `globals.css`

### 10. AI Experience Interview (`/interview`)
An AI-guided career interview that builds a detailed experience document from the user's work history:
- **Role checklist** — extracts companies, titles, and date ranges from existing My Experience library via Haiku; user selects which roles to cover (most recent first) and can add custom roles not in their documents
- **Company research** — after each role is set up, Haiku generates a 3–5 sentence company + role summary; user confirms accuracy or clarifies before the interview starts
- **Adaptive AI conversation** — each turn calls Claude Sonnet with the full chat history and system context; Claude decides what to ask next rather than following a fixed script
- **Quick-reply choices** — Claude ends messages with `CHOICES: A | B | C`; UI parses and renders these as pill buttons; "Move to next role" triggers role completion
- **Cross-device draft persistence** — draft auto-saves to Supabase `interview_sessions` table after each role completes and on "Save & exit"; user can resume on any device (mobile or desktop)
- **Output** — generates a detailed, formatted experience document via Sonnet; user names and saves it to My Experience or copies to clipboard
- Accessible from the My Experience page header ("Build experience doc →" with Beta badge)

### 11. Feedback
Users can submit feedback or bug reports at any time:
- **Hamburger menu** — feedback option in the nav dropdown on all screen sizes
- **Footer** — persistent feedback button at the bottom of every page
- Two types: General and Bug Report
- Submissions are saved to Supabase `feedback` table

### 12. Interview Prep
After a resume is generated (or from the AI Resumes dashboard), users can generate tailored interview prep:
- **8 AI-generated questions** across 6 categories: Technical (2), Behavioral (2), Motivation (1), Background (1), Situational (1), Curveball (1)
- Each question includes **2–3 answer hints** grounded in the actual resume content and a **resume reference** (direct quote from the generated resume)
- **Skeleton loading UI** — modal opens immediately with 8 animated placeholder cards while Haiku generates, so users get instant feedback
- **Practiced tracking** — toggle each question as practiced; state persists in `localStorage` keyed by `applicationId`
- **Regenerate** — one-click regeneration of a fresh question set
- Category badges are color-coded: Technical=blue, Behavioral=purple, Motivation=green, Background=slate, Situational=orange, Curveball=red
- Available on the home page post-generation via a collapsible "Interview Prep" section, and on each card in the AI Resumes dashboard via the Target icon
- Questions are saved to `applications.interview_prep` (JSONB) and loaded lazily to avoid breaking the dashboard if the migration hasn't run

### 13. Chrome Extension
A companion Chrome extension for one-click resume generation from any job board. **Now live on the Chrome Web Store.**
- **Tab scraping** — reads the active tab's job title, company, full description, and application questions automatically; no copy-pasting required
- Works on LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, and direct company job pages
- Side panel UI — generates tailored resume and cover letter without leaving the job posting
- Same generation quality as the webapp — draws from your My Experience library
- Follow-up questions panel: enter tough interview questions, get AI-written answers
- Cancel button, elapsed generation timer, cover letter download
- Chrome Web Store: https://chromewebstore.google.com/detail/foodpkmblpknlbkmdnnlgjkbnnhmbcid

### 14. Versioning
Easy Apply uses a CalVer-style version format: `{Major}.{YY}{M}.{DD}{H}` — e.g. `1.263.259` for version 1, March 2026, 25th day, 9am.
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
- **Hamburger-only nav** — All navigation (Tailor New Resume, AI Resumes, My Experience) lives in the hamburger dropdown on all screen sizes. No always-visible nav links on desktop.

---

## Project Structure

```
app/
  page.tsx                  # Home — landing page (signed-out) + goal/welcome routing (signed-in)
  layout.tsx                # Root layout with Clerk provider, theme script, Footer, and favicon/og metadata
  globals.css               # CSS variables for light/dark themes + .easy-apply-tour driver.js overrides
  dashboard/
    page.tsx                # AI Resumes dashboard (server component)
    ApplicationList.tsx     # Client component — multi-select, delete
    ApplicationCard.tsx     # Resume card — download, preview, Q&A modal, fit analysis lightbulb
    loading.tsx             # Skeleton UI for Suspense boundary
  resumes/
    page.tsx                # My Experience library page (server component); includes Contact Information section
    ResumeLibrary.tsx       # Client component — drag-and-drop or click upload, edit, set default
    loading.tsx             # Skeleton UI
  tailor/
    layout.tsx              # Route layout — exports metadata (title) for the client-component page
  polished-resume/
    page.tsx                # Polished resume page — auth guard, fetches source docs; exports metadata
  interview/
    page.tsx                # Server wrapper — auth guard, renders InterviewClient
    InterviewClient.tsx     # Full adaptive interview state machine (10 steps)
  api/
    analyze-fit/            # POST — Haiku fit analysis, returns FitAnalysis JSON
    generate-documents/     # POST — Sonnet streaming SSE (Edge runtime) + optional question answers; injects profile contact info
    fetch-job-posting/      # POST — URL scrape, HTML extraction, company/title/question detection
    parse-job-details/      # POST — Haiku extraction of company, job title, and questions from pasted JD text
    extract-resume/         # POST — PDF/DOCX text extraction
    download-pdf/[type]/    # POST — PDF generation and download; all types prefer profile.full_name for candidateName
    generate-polished-resume/ # POST — Sonnet builds standalone resume from selected docs; injects profile contact info
    base-resume-chat/       # POST — Sonnet CHANGE/ANSWER chat for polished resume refinement
    resumes/                # GET/POST — My Experience CRUD
    applications/           # DELETE bulk
    applications/[id]/      # GET single (for PDF preview) + DELETE single
    feedback/               # POST — save feedback to Supabase
    interview-prep/         # POST — Haiku generates 8 interview questions; saves to applications.interview_prep
    log-event/              # POST — Server-side analytics logging (Vercel function logs)
    profile/                # GET — fetch user_profiles row (empty defaults if missing); PUT — upsert contact info
    extract-contact/        # POST — Haiku extracts name/email/location/LinkedIn from first 800 chars of resume text
    interview/
      research/             # POST — Haiku company + role summary
      chat/                 # POST — Sonnet adaptive chat turn
      generate/             # POST — Sonnet experience document generation
      extract-roles/        # POST — Haiku role extraction from uploaded documents
      sessions/             # GET/POST — draft session management
      sessions/[id]/        # PATCH/DELETE — update or delete a session

components/
  Navbar.tsx                # Hamburger nav (all screen sizes) — navigation + theme + feedback + tour; logo shows Easy Apply AI superscript
  Footer.tsx                # Persistent footer — attribution + feedback shortcut
  ExperiencePanel.tsx       # Collapsible experience panel in tailor form — primary doc + additional context
  ContextSelector.tsx       # Legacy library picker (still used in some flows)
  PolishedResumeCreator.tsx # 4-step polished resume creation flow (select → configure → generate → review)
  FitAnalysisModal.tsx      # Reusable fit analysis modal — top 3 per section by default, expandable
  InlinePDFViewer.tsx       # Inline PDF iframe (US Letter aspect ratio) shown post-generation
  ResumeChatPanel.tsx       # Post-generation chat UI — page fit chips, CHANGE/ANSWER response parsing
  FeedbackModal.tsx         # Feedback form modal — general and bug report types
  PDFPreviewModal.tsx       # PDF preview modal — BlobProvider iframe, dynamically imported (ssr: false)
  TourGuide.tsx             # driver.js onboarding tour; popoverClass: 'easy-apply-tour'; exports startTour()
  InterviewPrepPanel.tsx    # Interview prep UI — QuestionCard, SkeletonQuestionCard, InterviewPrepSection

lib/
  supabase.ts               # Singleton Supabase client (service role)
  models.ts                 # Cached model ID fetcher with fallback
  pipeline-utils.ts         # Shared SSE helpers, JSON parser, context block builder
  extract-contact.ts        # extractContactFields(text) + inferContactFromDocs(docs, maxDocs)

types/
  fit-analysis.ts           # FitAnalysis, FitPoint, OverallFit, RoleType
  resume.ts                 # ResumeItem, ItemType, ITEM_TYPE_LABELS
  database.ts               # Full Supabase Database interface
  interview-prep.ts         # InterviewPrep, InterviewQuestion, InterviewQuestionCategory

supabase/migrations/        # SQL migration files (001–013)

public/
  favicon.ico               # App favicon
  favicon-16x16.png         # 16×16 PNG favicon
  favicon-32x32.png         # 32×32 PNG favicon
  apple-touch-icon.png      # iOS home screen icon
  android-chrome-192x192.png  # Android / PWA icon
  android-chrome-512x512.png  # Android / PWA icon + og-image placeholder
  site.webmanifest          # Web app manifest — name, icons, theme_color (#0a0a0a), display: standalone

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
