export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

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

  // Truncate at application form noise
  for (const marker of TRUNCATE_AT) {
    const idx = jobDescription.toLowerCase().indexOf(marker.toLowerCase());
    if (idx !== -1) {
      console.log(`[fetch-job-posting] Truncated at marker: "${marker}" (idx ${idx})`);
      jobDescription = jobDescription.slice(0, idx).trim();
      break;
    }
  }

  // Backstop: remove trailing noise by finding the last substantive line (>25 chars).
  // Form fields and whitespace-only lines are always short — this catches sites where
  // TRUNCATE_AT markers don't match the exact text.
  {
    const lines = jobDescription.split('\n');
    let lastSubstantial = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 25) lastSubstantial = i;
    }
    if (lastSubstantial !== -1 && lastSubstantial < lines.length - 4) {
      jobDescription = lines.slice(0, lastSubstantial + 1).join('\n').trim();
    }
  }

  console.log('[fetch-job-posting] Final length:', jobDescription.length);
  return Response.json({ jobDescription, company, jobTitle });
}
