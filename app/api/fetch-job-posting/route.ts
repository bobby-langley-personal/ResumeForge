export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// Sites that require login and can't be scraped
const BLOCKED_HOSTS = ['linkedin.com', 'www.linkedin.com'];

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
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

  // Block sites that require login
  if (BLOCKED_HOSTS.includes(parsed.hostname)) {
    return new Response(
      'LinkedIn requires you to be signed in — copy and paste the job description manually instead.',
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

  const jobDescription = extractText(html);
  if (!jobDescription || jobDescription.length < 100) {
    return new Response('Could not extract content from this page', { status: 422 });
  }

  const company = detectCompany(html, url);
  const jobTitle = detectJobTitle(html);

  return Response.json({ jobDescription, company, jobTitle });
}
