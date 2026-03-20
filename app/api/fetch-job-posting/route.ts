export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

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

function detectCompany(html: string, url: string): string | undefined {
  // Try og:site_name
  const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1];
  if (ogSite) return ogSite.trim();

  // Try <title> — often "Job Title at Company | Board"
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) {
    const atMatch = title.match(/ at ([^|–—\-]+)/i)?.[1]?.trim();
    if (atMatch && atMatch.length < 60) return atMatch;
  }

  // Try common job board URL patterns
  try {
    const { hostname } = new URL(url);
    // greenhouse: boards.greenhouse.io/companyname
    const greenhouse = url.match(/greenhouse\.io\/([^/?#]+)/i)?.[1];
    if (greenhouse) return greenhouse.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // lever: jobs.lever.co/companyname
    const lever = url.match(/lever\.co\/([^/?#]+)/i)?.[1];
    if (lever) return lever.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // workday: companyname.wd1.myworkdayjobs.com
    const workday = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/i)?.[1];
    if (workday) return workday.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    // ignore URL parse errors
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

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new Response('URL must use http or https', { status: 400 });
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

  return Response.json({ jobDescription, company });
}
