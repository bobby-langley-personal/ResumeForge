import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = supabaseServer();
  const { data } = await supabase
    .from('user_profiles')
    .select('full_name, email, location, linkedin_url')
    .eq('user_id', userId)
    .single();

  return NextResponse.json(data ?? { full_name: '', email: '', location: '', linkedin_url: '' });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { full_name, email, location, linkedin_url } = await req.json();

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, full_name: full_name ?? '', email: email ?? '', location: location ?? '', linkedin_url: linkedin_url ?? '' }, { onConflict: 'user_id' })
    .select('full_name, email, location, linkedin_url')
    .single();

  if (error) {
    console.error('[profile PUT]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
