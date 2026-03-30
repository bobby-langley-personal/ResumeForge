import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ResumeLibrary from './ResumeLibrary';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ResumeItem } from '@/types/resume';

export const metadata = { title: 'My Documents — ResumeForge' };

export default async function ResumesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('resumes')
    .select('id, user_id, title, content, item_type, is_default, created_at, updated_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) console.error('[resumes page]', error.message);

  const allItems = (data ?? []).map((item: any) => ({
    ...item,
    content: typeof item.content === 'string' ? JSON.parse(item.content) : item.content,
  })) as ResumeItem[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/tailor" className="flex items-center gap-1.5 w-fit text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" />
          Back to resume generator
        </Link>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your documents and context files
            </p>
          </div>
          <Link href="/interview">
            <Button variant="outline" className="relative">
              Build experience doc →
              <span className="absolute -top-2 -right-2 text-[9px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                Beta
              </span>
            </Button>
          </Link>
        </div>
        <ResumeLibrary initialItems={allItems} />
      </main>
    </div>
  );
}
