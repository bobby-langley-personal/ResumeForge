import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ApplicationList from './ApplicationList';
import { Button } from '@/components/ui/button';
import { FileSearch } from 'lucide-react';

export const metadata = { title: 'AI Resumes — ResumeForge' };

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = supabaseServer();
  const { data: applications, error } = await supabase
    .from('applications')
    .select('id, company, job_title, cover_letter_content, question_answers, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) console.error('[dashboard] Supabase error:', error.message);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">AI Resumes</h2>
        </div>

        {(applications ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <FileSearch className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No tailored resumes yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Generate your first tailored resume to see it here.
            </p>
            <Link href="/"><Button>Tailor Your First Resume</Button></Link>
          </div>
        ) : (
          <ApplicationList initialItems={(applications ?? []) as ApplicationItem[]} />
        )}
      </main>
    </div>
  );
}

// exported for ApplicationList to use the same type
export interface ApplicationItem {
  id: string;
  company: string;
  job_title: string;
  cover_letter_content: string | null;
  question_answers: { question: string; answer: string }[] | null;
  created_at: string;
}
