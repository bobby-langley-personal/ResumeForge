import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ApplicationList, { ApplicationItem } from './ApplicationList';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileSearch } from 'lucide-react';

export const metadata = { title: 'Dashboard — ResumeForge' };

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { data: applications, error } = await supabase
    .from('applications')
    .select('id, company, job_title, cover_letter_content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[dashboard] Supabase error:', error.message);
  }

  const items = applications ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">My Applications</h2>
          <Link href="/">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <FileSearch className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No applications yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Generate your first tailored resume to see it here.
            </p>
            <Link href="/">
              <Button>Generate Your First Resume</Button>
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <ApplicationList initialItems={items as ApplicationItem[]} />
        )}
      </main>
    </div>
  );
}
