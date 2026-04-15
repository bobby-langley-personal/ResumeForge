export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';

export async function POST(req: NextRequest) {
  let body: { uid?: string; token?: string };
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const { uid, token } = body;
  if (!uid || !token) return new Response('Missing uid or token', { status: 400 });
  if (!verifyUnsubscribeToken(uid, token)) return new Response('Invalid token', { status: 403 });

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('users')
    .update({ email_unsubscribed: true })
    .eq('id', uid);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}

// Re-subscribe
export async function DELETE(req: NextRequest) {
  let body: { uid?: string; token?: string };
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const { uid, token } = body;
  if (!uid || !token) return new Response('Missing uid or token', { status: 400 });
  if (!verifyUnsubscribeToken(uid, token)) return new Response('Invalid token', { status: 403 });

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('users')
    .update({ email_unsubscribed: false })
    .eq('id', uid);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
