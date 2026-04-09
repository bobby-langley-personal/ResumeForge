import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const { data: user } = await supabase
      .from('users')
      .select('subscription_status, subscription_period_end, tailored_resume_count')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      subscription_status: user?.subscription_status ?? 'free',
      subscription_period_end: user?.subscription_period_end ?? null,
      tailored_resume_count: user?.tailored_resume_count ?? 0,
    });
  } catch (err) {
    console.error('[/api/billing/status]', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
