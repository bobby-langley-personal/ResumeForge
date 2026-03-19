import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  const payload = await req.text();
  const body = JSON.parse(payload);

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
    return new Response('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id: clerkUserId, email_addresses, created_at, updated_at } = evt.data;

    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      return new Response('No primary email found', { status: 400 });
    }

    try {
      const userData = {
        clerk_user_id: clerkUserId,
        email: primaryEmail.email_address,
        updated_at: new Date().toISOString(),
      };

      if (eventType === 'user.created') {
        await supabaseServer.from('users').insert({
          ...userData,
          created_at: new Date(created_at).toISOString(),
        });
      } else {
        await supabaseServer
          .from('users')
          .update(userData)
          .eq('clerk_user_id', clerkUserId);
      }

      return new Response('User synced successfully', { status: 200 });
    } catch (error) {
      console.error('Error syncing user to database:', error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}