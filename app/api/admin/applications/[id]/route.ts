export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('applications')
    .select('id, user_id, company, job_title, resume_content, cover_letter_content, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', data.user_id)
    .maybeSingle();

  return Response.json({ ...data, candidateName: profile?.full_name ?? null });
}
