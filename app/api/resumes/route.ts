import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// GET /api/resumes — list all items for the current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from('resumes')
      .select('id, title, content, item_type, is_default, created_at, updated_at')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/resumes] Supabase error:', error);
      return new Response(error.message, { status: 500 });
    }

    // Normalize content: if stored as a string (TEXT column), parse it
    const normalized = (data ?? []).map((item: any) => ({
      ...item,
      content: typeof item.content === 'string' ? JSON.parse(item.content) : item.content,
    }));
    return Response.json(normalized);
  } catch (err) {
    console.error('[GET /api/resumes] Unexpected error:', err);
    return new Response(err instanceof Error ? err.message : 'Internal server error', { status: 500 });
  }
}

// POST /api/resumes — create a new item
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { title, content, item_type = 'resume', is_default = false } = await req.json();
  if (!title || !content?.text) return new Response('title and content.text are required', { status: 400 });

  const supabase = await supabaseServer();

  // Clear existing default first if this one is being set as default
  if (is_default) {
    await supabase
      .from('resumes')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('resumes')
    .insert({ user_id: userId, title, content, item_type, is_default })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
