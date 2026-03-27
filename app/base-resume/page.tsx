import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import BaseResumeCreator from '@/components/BaseResumeCreator';
import { ResumeItem } from '@/types/resume';

export const metadata = { title: 'Base Resume — ResumeForge' };

export default async function BaseResumePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = supabaseServer();
  const { data } = await supabase
    .from('resumes')
    .select('id, user_id, title, content, item_type, is_default, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const items = (data ?? []).map((item: any) => ({
    ...item,
    content: typeof item.content === 'string' ? JSON.parse(item.content) : item.content,
  })) as ResumeItem[];

  const existingBaseResume = items.find(i => i.item_type === 'base_resume') ?? null;
  const sourceDocuments = items.filter(i => i.item_type !== 'base_resume');

  // If ?id param present and matches existing base resume, load in edit mode
  const editId = searchParams.id;
  const editItem = editId ? items.find(i => i.id === editId) ?? null : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BaseResumeCreator
          sourceDocuments={sourceDocuments}
          existingBaseResume={existingBaseResume}
          editItem={editItem}
        />
      </main>
    </div>
  );
}
