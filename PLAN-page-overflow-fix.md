# Page Overflow Fix — Execution Plan

## Problem
Tailored resumes are overflowing to 3 pages. The AI has no page awareness in its prompt,
and the PDF renderer has no safety net to enforce a page limit. The `compact` prop on
`ResumePDF` (0.85x spacing) exists but is never triggered.

## Branch
Create from `origin/main`: `fix/page-overflow-autocompact`

---

## Step 1: Update generate-documents prompt

**File**: `app/api/generate-documents/route.ts`

In the resume generation `system` prompt (around line 143), make two changes:

### 1a. Add a PAGE TARGET block right after the opening sentence

Insert this immediately after "...best possible chance of getting an interview.":

```
PAGE TARGET: This resume must fit within 2 pages when rendered in a standard PDF template (10pt Helvetica, 0.75in margins). Aim for ~800-1000 words of content. If the candidate has many roles, prioritize depth on recent/relevant roles and keep earlier roles brief. Do not overflow to a third page.
```

### 1b. Revert bullet count rule to conservative values

Find the bullet count line and change it to:

```
- Bullet point count per role: most recent or primary role 6-8; supporting roles 4-6; early career or less relevant roles 3-4. Every bullet must earn its place - do not pad to hit the max. If two bullets cover closely related work, combine them into one stronger bullet. Never exceed 8.
```

These are the values that were working before the regression. Do NOT use the 8-10 values
from CLAUDE.md — those are aspirational and cause 3-page overflow.

**Keep `max_tokens: 8000`** — this is correct. The model stops naturally when done; a high
ceiling prevents truncation without increasing cost.

---

## Step 2: Create auto-compact render helper

**New file**: `lib/pdf/render-with-autocompact.ts`

This helper renders a PDF, checks the page count, and re-renders with `compact=true` if
the page count exceeds the target.

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PDFDocument } from 'pdf-lib'
import { stripBlankTrailingPages } from './strip-blank-pages'

/**
 * Render a PDF component, and if the result exceeds targetPages,
 * re-render with compact=true to tighten spacing.
 *
 * The component must accept a `compact?: boolean` prop.
 */
export async function renderWithAutoCompact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>,
  props: Record<string, unknown>,
  targetPages: number = 2
): Promise<Buffer> {
  // First pass: normal rendering
  const normalElement = createElement(Component, { ...props, compact: false })
  const normalRaw = await renderToBuffer(normalElement as React.ReactElement)
  const normalBuffer = await stripBlankTrailingPages(Buffer.from(normalRaw))

  const doc = await PDFDocument.load(normalBuffer)
  if (doc.getPageCount() <= targetPages) {
    return normalBuffer
  }

  // Second pass: compact rendering (0.85x spacing)
  const compactElement = createElement(Component, { ...props, compact: true })
  const compactRaw = await renderToBuffer(compactElement as React.ReactElement)
  return stripBlankTrailingPages(Buffer.from(compactRaw))
}
```

**Note**: `pdf-lib` is already a dependency (used by `strip-blank-pages.ts`). No new
packages needed.

---

## Step 3: Wire auto-compact into PDF download routes

### 3a. Resume route (`app/api/download-pdf/resume/route.ts`)

Replace this block (around lines 57-59):
```typescript
const element = createElement(ResumePDF, props)
const rawBuffer = await renderToBuffer(element as React.ReactElement<any>)
const pdfBuffer = await stripBlankTrailingPages(Buffer.from(rawBuffer))
```

With:
```typescript
const pdfBuffer = await renderWithAutoCompact(ResumePDF, props, 2)
```

Add import at top:
```typescript
import { renderWithAutoCompact } from '@/lib/pdf/render-with-autocompact'
```

Remove now-unused imports: `renderToBuffer` from `@react-pdf/renderer`, `createElement`
from `react`, `stripBlankTrailingPages` from `@/lib/pdf/strip-blank-pages`.

### 3b. Polished resume route (`app/api/download-pdf/polished/route.ts`)

Same pattern. Read this file first to find the equivalent render block.

**Important**: This route already has a `pageLimit` concept (the user picks 1-4 pages).
Look for it in the request body. Use that as the target:

```typescript
const pdfBuffer = await renderWithAutoCompact(ResumePDF, props, pageLimit || 2)
```

If `pageLimit` is not in the request body for this route, default to 2.

### 3c. Cover letter route (`app/api/download-pdf/cover-letter/route.ts`)

Same pattern, target 1 page:
```typescript
const pdfBuffer = await renderWithAutoCompact(CoverLetterPDF, props, 1)
```

Read this file first to confirm the component name and prop shape.

---

## Step 4: Update CLAUDE.md

### 4a. Bullet count rules section

Find the "Resume Generation - Bullet Point Rules" section. Change the bullet count rule to
match the actual prompt values:

```
- **Bullet count by role seniority** -- most recent/primary role 6-8; supporting roles
  4-6; early career or less relevant roles 3-4. Every bullet must earn its place. If two
  bullets cover closely related work, combine them. Hard ceiling: 8 bullets per role.
```

Remove any "aim for the higher end" or "should fill 2 pages" language that encourages
overflow.

### 4b. Add auto-compact documentation

Add a new subsection under "PDF Page Overflow Policy":

```
**Auto-compact rendering** -- all PDF download routes use `renderWithAutoCompact()` from
`lib/pdf/render-with-autocompact.ts`. On first render, if the page count exceeds the
target (2 for resumes, 1 for cover letters), the PDF is re-rendered with `compact=true`
(0.85x spacing). This is a safety net for when the AI overshoots the page target.
```

---

## Step 5: TypeScript check and commit

```bash
npx tsc --noEmit
```

Fix any type errors. Then:

```bash
git checkout -b fix/page-overflow-autocompact origin/main
git add app/api/generate-documents/route.ts \
        lib/pdf/render-with-autocompact.ts \
        app/api/download-pdf/resume/route.ts \
        app/api/download-pdf/polished/route.ts \
        app/api/download-pdf/cover-letter/route.ts \
        CLAUDE.md
git commit  # message: "fix: add 2-page target to resume prompt + auto-compact PDF rendering"
git push -u origin fix/page-overflow-autocompact
gh pr create --base main --title "fix: 2-page target + auto-compact PDF rendering" \
  --body "## Summary
- Add PAGE TARGET instruction to generate-documents prompt (2 pages, ~800-1000 words)
- Revert bullet counts to working values (6-8 / 4-6 / 3-4)
- Add renderWithAutoCompact helper: renders PDF, checks page count, re-renders compact if over target
- Wire auto-compact into all 3 PDF download routes (resume, polished, cover-letter)

## Test plan
- [ ] Generate a resume with SUMMARY enabled for a candidate with 5+ roles -- should be 2 pages, not 3
- [ ] Download PDF -- verify auto-compact kicks in if content is borderline
- [ ] Generate a 1-page polished resume -- verify it stays at 1 page
- [ ] Cover letter download stays at 1 page"
```

---

## What NOT to do

- Do NOT touch DOCX endpoints or staging features -- those stay on the staging branch
- Do NOT change the `compact` prop type from boolean -- keep it as-is for now
- Do NOT modify `ResumePDF.tsx` or `makeStyles` -- the existing 0.85x scaling is fine
- Do NOT add a user-facing page limit toggle -- that's a future feature

## Notes for merge conflicts

The local `hotfix/remove-deprecated-temperature` branch has a stale version of the prompt
edit. Do NOT use that branch. Start fresh from `origin/main` which already has the
temperature removal and max_tokens bump (PR #186).

---

Delete this file after the PR is merged.
