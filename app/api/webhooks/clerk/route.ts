import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', { status: 400 });
  }

  const eventType = evt.type;

  // session.created fires on every sign-in. Use it to migrate users who already
  // created a prod Clerk account before the migration webhook was deployed.
  if (eventType === 'session.created') {
    const userId = (evt.data as { user_id: string }).user_id;
    const supabase = supabaseServer();

    // If they already have a prod row, nothing to do
    const { data: prodUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!prodUser) {
      // No prod row — look for a dev row by email
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress;

      if (email) {
        const { data: devUser } = await supabase
          .from('users')
          .select('id, tailored_resume_count, subscription_status, stripe_customer_id, subscription_period_end')
          .eq('email', email)
          .neq('id', userId)
          .maybeSingle();

        if (devUser) {
          const oldId = devUser.id;
          console.log(`[webhook] session.created: migrating ${oldId} → ${userId} (${email})`);

          await Promise.all([
            supabase.from('resumes').update({ user_id: userId }).eq('user_id', oldId),
            supabase.from('applications').update({ user_id: userId }).eq('user_id', oldId),
            supabase.from('user_profiles').update({ user_id: userId }).eq('user_id', oldId),
            supabase.from('interview_sessions').update({ user_id: userId }).eq('user_id', oldId),
          ]);

          await supabase.from('users').delete().eq('id', oldId);

          const full_name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
          await supabase.from('users').upsert({
            id: userId,
            email,
            full_name,
            tailored_resume_count: devUser.tailored_resume_count ?? 0,
            subscription_status: devUser.subscription_status ?? 'free',
            stripe_customer_id: devUser.stripe_customer_id ?? null,
            subscription_period_end: devUser.subscription_period_end ?? null,
          }, { onConflict: 'id' });

          console.log(`[webhook] session.created: migration complete for ${email} (count: ${devUser.tailored_resume_count ?? 0}, status: ${devUser.subscription_status ?? 'free'})`);
        }
      }
    }
  }

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response('No email found', { status: 400 });
    }

    const full_name = [first_name, last_name].filter(Boolean).join(' ') || null;
    const supabase = supabaseServer();

    // On user.created, check if this email already has data from a previous
    // Clerk instance (e.g. dev → prod migration). If so, re-parent all rows
    // to the new user ID before upserting the users record.
    let inheritedBilling: {
      tailored_resume_count: number;
      subscription_status: 'free' | 'pro' | 'canceled';
      stripe_customer_id: string | null;
      subscription_period_end: string | null;
    } | null = null;

    if (eventType === 'user.created') {
      const { data: existing } = await supabase
        .from('users')
        .select('id, tailored_resume_count, subscription_status, stripe_customer_id, subscription_period_end')
        .eq('email', email)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        const oldId = existing.id;
        console.log(`[webhook] migrating data from ${oldId} → ${id} (${email})`);
        const rawStatus = existing.subscription_status;
        inheritedBilling = {
          tailored_resume_count: existing.tailored_resume_count ?? 0,
          subscription_status: (rawStatus === 'pro' || rawStatus === 'canceled') ? rawStatus : 'free',
          stripe_customer_id: existing.stripe_customer_id ?? null,
          subscription_period_end: existing.subscription_period_end ?? null,
        };

        await Promise.all([
          supabase.from('resumes').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('applications').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('user_profiles').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('interview_sessions').update({ user_id: id }).eq('user_id', oldId),
        ]);

        // Remove the stale users row so the upsert below can insert cleanly
        await supabase.from('users').delete().eq('id', oldId);

        console.log(`[webhook] migration complete for ${email} (count: ${inheritedBilling.tailored_resume_count}, status: ${inheritedBilling.subscription_status})`);
      }
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        email,
        full_name,
        ...(inheritedBilling ?? {}),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error syncing user:', error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
