import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const [{ data: user }, { count: documentCount }] = await Promise.all([
      supabase
        .from('users')
        .select('subscription_status, subscription_period_end, tailored_resume_count, weekly_resume_count, weekly_window_start, chat_unlocked_count, interview_prep_count, experience_interview_count')
        .eq('id', userId)
        .single(),
      supabase
        .from('resumes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    // Compute effective weekly count — reset if the window has expired
    const windowStart = user?.weekly_window_start ? new Date(user.weekly_window_start) : null;
    const windowExpired = !windowStart || Date.now() - windowStart.getTime() >= 7 * 24 * 60 * 60 * 1000;
    const weeklyResumeCount = windowExpired ? 0 : (user?.weekly_resume_count ?? 0);
    const weeklyWindowEndsAt = windowExpired ? null : new Date(windowStart!.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      subscription_status: user?.subscription_status ?? 'free',
      subscription_period_end: user?.subscription_period_end ?? null,
      tailored_resume_count: user?.tailored_resume_count ?? 0,
      weekly_resume_count: weeklyResumeCount,
      weekly_window_ends_at: weeklyWindowEndsAt,
      document_count: documentCount ?? 0,
      chat_unlocked_count: user?.chat_unlocked_count ?? 0,
      interview_prep_count: user?.interview_prep_count ?? 0,
      experience_interview_count: user?.experience_interview_count ?? 0,
    });
  } catch (err) {
    console.error('[/api/billing/status]', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
