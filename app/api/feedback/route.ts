export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { type?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type, message } = body;
  if (!type || !message?.trim()) return new Response('Missing fields', { status: 400 });
  if (type !== 'general' && type !== 'bug') return new Response('Invalid type', { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    type: type as 'general' | 'bug',
    message: message.trim(),
  });

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
