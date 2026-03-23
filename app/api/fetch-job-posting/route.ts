export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON } from '@/lib/pipeline-utils';

const TRUNCATE_AT = [
  'Apply for this job',
  'Submit application',
  'Submit Your Application',
  'Create a Job Alert',
  'Equal Employment Opportunity',
  'Voluntary Self-Identification',
  'indicates a required field',
  'Autofill with',
  'First Name*',
  'Legal first name',
  'Resume/CV',
  'Upload resume',
  'Upload Resume',
  'Please enter your',
  'Cover letter\n',
  // Universal EEO closing line — appears at the end of most job postings, right before the form
  'is an equal opportunity employer',
  'is an Equal Opportunity Employer',
  'equal opportunity and affirmative action employer',
];

function extractText(html: string): string {
  return html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')   // strip <head> so <title> doesn't appear in output
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))       // &#038; &#8211; etc.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getMetaContent(html: string, property: string): string | undefined {
  return (
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'))?.[1]
  )?.trim();
}

function detectCompany(html: string, url: string): string | undefined {
  // og:site_name is the most reliable signal
  const ogSite = getMetaContent(html, 'og:site_name');
  if (ogSite) return ogSite;

  // Title pattern: "Job Title at Company | Board" or "Job Title - Company"
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) {
    const atMatch = title.match(/ at ([^|–—]+)/i)?.[1]?.trim();
    if (atMatch && atMatch.length < 60) return atMatch;
  }

  // URL patterns for major job boards
  try {
    const { hostname } = new URL(url);
    const greenhouse = url.match(/greenhouse\.io\/([^/?#]+)/i)?.[1];
    if (greenhouse) return greenhouse.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const lever = url.match(/lever\.co\/([^/?#]+)/i)?.[1];
    if (lever) return lever.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const workday = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/i)?.[1];
    if (workday) return workday.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    // ignore
  }

  return undefined;
}

function detectJobTitle(html: string): string | undefined {
  // og:title is usually the most specific — often "Job Title at Company" or just "Job Title"
  const ogTitle = getMetaContent(html, 'og:title');
  if (ogTitle) {
    // Strip " at Company" suffix and board name suffixes
    const stripped = ogTitle
      .replace(/ at [^|–—]+$/i, '')
      .replace(/\s*[|·\-–—].*$/, '')
      .trim();
    if (stripped && stripped.length < 120) return stripped;
  }

  // Fall back to <title> tag with aggressive stripping
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) {
    const stripped = title
      .replace(/ at [^|–—]+$/i, '')
      .replace(/\s*[|·\-–—].*$/, '')
      .replace(/\s*(job|jobs|careers?|apply|application)\s*$/i, '')
      .trim();
    if (stripped && stripped.length < 120) return stripped;
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return new Response('url is required', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new Response('URL must use http or https', { status: 400 });
  }

  // Block LinkedIn — requires login, can't be scraped
  if (url.includes('linkedin.com/jobs')) {
    return Response.json(
      { error: 'LinkedIn blocks URL scraping — copy and paste the job description manually instead.', code: 'LINKEDIN_BLOCKED' },
      { status: 422 }
    );
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResumeForge/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return new Response(`Page returned ${res.status}`, { status: 422 });
    }
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Failed to fetch page: ${msg}`, { status: 500 });
  }

  let jobDescription = extractText(html);
  if (!jobDescription || jobDescription.length < 100) {
    return new Response('Could not extract content from this page', { status: 422 });
  }

  // Detect from HTML metadata first so we can use the title to find content start
  const company = detectCompany(html, url);
  const jobTitle = detectJobTitle(html);

  // Skip past nav/menu noise at the top by seeking to where the job title appears in the text.
  // Many sites render nav as <div> elements (not <nav>) so tag-stripping alone misses them.
  if (jobTitle) {
    const needle = jobTitle.slice(0, 25).toLowerCase();
    const titleIdx = jobDescription.toLowerCase().indexOf(needle);
    if (titleIdx > 200) {
      jobDescription = jobDescription.slice(titleIdx).trim();
    }
  }

  // Truncate at application form noise — find the EARLIEST matching marker in the document
  // (not the first marker in list order, which could match late in the document)
  let formSection = '';
  let truncated = false;
  {
    let earliestIdx = -1;
    let earliestMarker = '';
    for (const marker of TRUNCATE_AT) {
      const idx = jobDescription.toLowerCase().indexOf(marker.toLowerCase());
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        earliestMarker = marker;
      }
    }
    if (earliestIdx !== -1) {
      console.log(`[fetch-job-posting] Truncated at marker: "${earliestMarker}" (idx ${earliestIdx})`);
      formSection = jobDescription.slice(earliestIdx, earliestIdx + 4000);
      jobDescription = jobDescription.slice(0, earliestIdx).trim();
      truncated = true;
    }
  }
  if (!truncated) {
    console.log('[fetch-job-posting] No TRUNCATE_AT marker matched. Last 200 chars:', jobDescription.slice(-200));
  }

  // Backstop: remove trailing noise by finding the last substantive line (>25 chars).
  {
    const lines = jobDescription.split('\n');
    let lastSubstantial = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 25) lastSubstantial = i;
    }
    if (lastSubstantial !== -1 && lastSubstantial < lines.length - 4) {
      if (!formSection) formSection = lines.slice(lastSubstantial + 1).join('\n').slice(0, 4000);
      jobDescription = lines.slice(0, lastSubstantial + 1).join('\n').trim();
    }
  }

  // Extract open-ended application questions from the form section using Haiku.
  // Skips identity/demographic/compliance fields — only written-response questions.
  let detectedQuestions: string[] = [];
  if (formSection.trim().length > 50 && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const { HAIKU } = await getModels();
      const response = await anthropic.messages.create({
        model: HAIKU,
        max_tokens: 400,
        system: `Extract open-ended written-response questions from job application form text.

INCLUDE questions that require a thoughtful written answer, e.g.:
- "Why do you want to work at [Company]?"
- "Describe a time you resolved a complex technical issue"
- "What are your motivations for this role?"

EXCLUDE:
- Personal info fields (name, email, phone, address, LinkedIn URL)
- Document uploads (resume, cover letter)
- Yes/No or dropdown fields (work authorization, sponsorship, GPA, graduation year)
- Demographic/identity fields (race, gender, disability, veteran status)
- Logistical questions (timezone, relocation, salary expectations)

Output JSON only, no markdown fences: {"questions": ["...", "..."]}
If none qualify, return {"questions": []}`,
        messages: [{ role: 'user', content: formSection }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const parsed = parseStageJSON<{ questions: unknown[] }>(text);
      detectedQuestions = (Array.isArray(parsed.questions) ? parsed.questions : [])
        .filter((q: unknown) => typeof q === 'string' && (q as string).trim().length > 0)
        .slice(0, 5) as string[];
      console.log('[fetch-job-posting] Detected questions:', detectedQuestions.length);
    } catch (err) {
      console.warn('[fetch-job-posting] Question extraction failed:', err instanceof Error ? err.message : err);
    }
  }

  console.log('[fetch-job-posting] Final JD length:', jobDescription.length);
  return Response.json({ jobDescription, company, jobTitle, detectedQuestions });
}
