# Changelog — Easy Apply AI (Web App)

All notable changes to the Easy Apply AI web app are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

> Changes staged for the next release.

---

## [2026-04-14] — Feedback & polish

### Added
- **In-app feedback form** — users can submit bug reports or general feedback directly from the app; submissions are saved to the database and automatically create a labelled GitHub issue with an AI-generated title and TL;DR summary
- Anonymous submission option — users can opt out of attaching their email to feedback

### Fixed
- Feedback route now returns `{ issueUrl }` so the extension can surface a link to the created issue

---

## [2026-04-13] — Onboarding, auth & extension compatibility

### Added
- **Full-screen onboarding overlay** for new users with no experience documents; persistent until at least one document is uploaded
- Escape links at the bottom of the WelcomeScreen for users who want to skip onboarding
- `/privacy` page — public-facing privacy policy covering extension permissions, third-party services, and data retention; no longer blocked by auth middleware

### Fixed
- Sign-in / sign-up OTP input fields now have a visible background (`#262626`) in dark mode — previously invisible against the page background
- Redirect `/tailor` to home screen when user has no experience documents loaded
- UserSync component added to `app/layout.tsx` — upserts `users` row on every authenticated page load so FK constraints are satisfied in both dev and prod environments

---

## [2026-04-09] — Stripe billing

### Added
- **Pro subscription** via Stripe — monthly, quarterly, and annual plans
- Free tier: 3 lifetime tailored resumes; counter displayed below the tailor form header
- Paywall modal on the tailor page when the free limit is reached; three plan buttons hit `/api/billing/create-checkout`
- Stripe Customer Portal for subscription management (`/api/billing/portal`)
- Billing status endpoint (`GET /api/billing/status`) — returns subscription status, period end, and resume count
- Stripe webhook handler (`POST /api/webhooks/stripe`) — handles checkout completion, subscription updates/deletions, and invoice events
- Navbar shows "Manage Subscription" for Pro users and "Upgrade to Pro" for free users with at least one resume used
- `/pricing` page — public, three plan cards; Pro users see confirmation state

### Fixed
- Stripe webhook returning 401 — added `/api/webhooks/stripe` to public routes in Clerk middleware
- Billing data preserved during user migration on re-registration

---

## [2026-04-07] — Onboarding & branding

### Added
- Drag-and-drop file uploads on the WelcomeScreen (PDF/DOCX); card highlights on drag-over
- Custom favicon, Apple touch icon, and PWA manifest (`site.webmanifest`)

### Fixed
- Logo and apple-touch-icon moved into `app/` for Next.js App Router auto-detection

---

## [2026-04-01 – 2026-04-04] — Resume chat quality & PDF fixes

### Added
- Quick-action chip restored after undo in `ResumeChatPanel`

### Fixed
- **Sourcing constraint enforced** in both resume chat bots — AI may only add content evidenced in background documents; unsupported additions are flagged as `GAP_REPORT` entries rather than silently included
- Polished resume chat: auto-scroll to latest message; section content no longer dropped during reframes; honest disclosure of prior edits in context
- Polished resume chat: markdown rendering fixed; data preserved correctly across chat turns
- PDF section header detection made resilient to AI format drift
- Undo breaking the inline PDF preview — `BlobProvider` now force-remounts via `blobKey` on every text change
- Trailing whitespace trimmed from all generated resume and cover letter text to prevent blank lines forcing extra PDF pages
- Orphan protection in `ResumePDF` — section header + first content line wrapped in `<View wrap={false}>`

---

## [2026-03-30] — Contact info, form UX & question extraction

### Added
- **User profile / contact info** — name, email, location, LinkedIn stored in `user_profiles` table; auto-extracted from uploaded resume via Haiku on first upload; contact info injected verbatim into resume and cover letter generation prompts
- Contact confirmation form shown immediately after first resume upload; "Skip for now" option available
- Contact info section on My Experience page — collapsed by default, auto-inferred from documents when empty
- **Application question extraction** from pasted job descriptions via Haiku (`/api/parse-job-details`) — detected questions auto-populate the questions field
- PDF download filename includes company + job title slug
- "Tailor New Resume" CTAs added from relevant pages
- Explicit temperature set on all Anthropic API calls (was previously relying on API default)

### Fixed
- ExperiencePanel now fires `onBackgroundChange` on mount with the default document loaded
- Auto-scroll to the fit analysis progress bar on form submit
- PDF viewer navigation pane hidden across all iframe previews
- Backdrop-click dismissal disabled on all modals app-wide (accidental dismissal was a common complaint)
- Location extraction corrected when PDFs strip the newline before the contact line
- Haiku JSON responses now have markdown fences stripped before parsing

### Changed
- Experience panel moved below the generate button in the tailor form layout
- WelcomeScreen redesigned as Experience Library onboarding flow

---

## [2026-03-25 – 2026-03-29] — AI interview & polished resume

### Added
- **AI Experience Interview** (`/interview`) — multi-role adaptive chat that builds a formatted experience document from a conversation; session persistence across devices; company research step before interview starts
- **Polished Resume** (`/polished-resume`) — 4-step flow: select documents → configure page limit + role type hint → generate → review with AI chat and inline PDF viewer
- Save-to-My-Experience and set-as-default options after polished resume generation
- Interview prep panel on dashboard cards — generates 8 interview questions across 6 categories on demand
- Job description modal on dashboard cards (formatted view)
- Eye-icon PDF preview on dashboard cards (lazy-loaded, cached after first fetch)

---

## How to use this changelog

- **GitHub Releases**: create a release tag (e.g. `v2026-04-14`) and paste the relevant section as the release body
- **Vercel**: deployments are automatic on push to `main`; no manual release step needed
- **Future entries**: add a new `## [YYYY-MM-DD] — Short title` section at the top of the file, under `[Unreleased]`
