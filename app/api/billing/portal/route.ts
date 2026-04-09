import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: 'https://easy-apply.ai/tailor',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[/api/billing/portal]', err);
    const message = err instanceof Error ? err.message : 'Portal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
