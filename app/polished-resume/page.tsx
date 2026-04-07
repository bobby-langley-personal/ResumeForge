import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabaseServer } from '@/lib/supabase';
import { ResumeItem } from '@/types/resume';
import PolishedResumeCreator from '@/components/PolishedResumeCreator';

export const metadata = { title: 'Polished Resume — Easy Apply AI' };

export default async function PolishedResumePage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const supabase = supabaseServer();
  const { data } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .neq('item_type', 'base_resume')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  const sourceDocuments = (data ?? []) as unknown as ResumeItem[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PolishedResumeCreator sourceDocuments={sourceDocuments} />
      </main>
    </div>
  );
}
