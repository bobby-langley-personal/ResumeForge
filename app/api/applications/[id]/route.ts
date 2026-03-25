import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// GET /api/applications/[id] — fetch content for PDF preview
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const supabase = supabaseServer();
  const { data: application, error } = await supabase
    .from('applications')
    .select('id, user_id, company, job_title, resume_content, cover_letter_content, interview_prep')
    .eq('id', id)
    .single();

  if (error || !application) return Response.json({ error: 'Not found' }, { status: 404 });
  if (application.user_id !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const user = await currentUser();
  const candidateName = user?.fullName ?? user?.firstName ?? '';

  return Response.json({
    company: application.company,
    jobTitle: application.job_title,
    resumeContent: application.resume_content,
    coverLetterContent: application.cover_letter_content,
    interviewPrep: application.interview_prep ?? null,
    candidateName,
  });
}

// DELETE /api/applications/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
