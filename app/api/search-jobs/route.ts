import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedAt: string;
}

async function checkAndIncrementUsage(supabase: ReturnType<typeof supabaseServer>): Promise<{ allowed: boolean }> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const limit = parseInt(process.env.JSEARCH_MONTHLY_LIMIT || '175');

  const { data: usage } = await supabase
    .from('api_usage')
    .select('call_count')
    .eq('api_name', 'jsearch')
    .eq('month', currentMonth)
    .single();

  if (usage && usage.call_count >= limit) {
    return { allowed: false };
  }

  await supabase
    .from('api_usage')
    .upsert({
      api_name: 'jsearch',
      month: currentMonth,
      call_count: (usage?.call_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'api_name,month' });

  return { allowed: true };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.trim();
  const location = searchParams.get('location')?.trim() ?? '';

  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'Job search is not configured.', code: 'NOT_CONFIGURED' }, { status: 503 });
  }

  const supabase = supabaseServer();
  const { allowed } = await checkAndIncrementUsage(supabase);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Job search is temporarily unavailable — monthly limit reached. Please paste the job description manually.', code: 'RATE_LIMIT_REACHED' },
      { status: 429 }
    );
  }

  const url = new URL('https://jsearch.p.rapidapi.com/search');
  url.searchParams.set('query', query + (location ? ' ' + location : ''));
  url.searchParams.set('num_pages', '1');
  url.searchParams.set('page', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Search unavailable — paste the job description manually.', code: 'API_ERROR' }, { status: 502 });
  }

  const data = await response.json();
  const jobs: JobResult[] = (data.data ?? []).slice(0, 5).map((j: Record<string, string>) => ({
    id: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    location: [j.job_city, j.job_state].filter(Boolean).join(', '),
    description: j.job_description,
    url: j.job_apply_link,
    postedAt: j.job_posted_at_datetime_utc,
  }));

  return NextResponse.json({ jobs });
}
