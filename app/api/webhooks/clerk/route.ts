import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
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
    if (eventType === 'user.created') {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        const oldId = existing.id;
        console.log(`[webhook] migrating data from ${oldId} → ${id} (${email})`);

        await Promise.all([
          supabase.from('resumes').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('applications').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('user_profiles').update({ user_id: id }).eq('user_id', oldId),
          supabase.from('interview_sessions').update({ user_id: id }).eq('user_id', oldId),
        ]);

        // Remove the stale users row so the upsert below can insert cleanly
        await supabase.from('users').delete().eq('id', oldId);

        console.log(`[webhook] migration complete for ${email}`);
      }
    }

    const { error } = await supabase
      .from('users')
      .upsert({ id, email, full_name }, { onConflict: 'id' });

    if (error) {
      console.error('Error syncing user:', error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
