export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { resumeId } = await params;
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('resumes')
    .select('id, title, item_type, content')
    .eq('id', resumeId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(data);
}
