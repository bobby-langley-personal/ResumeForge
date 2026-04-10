import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export const metadata = { title: 'Tailor New Resume — Easy Apply AI' };

export default async function TailorLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (userId) {
    const supabase = supabaseServer();
    const { count } = await supabase
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count ?? 0) === 0) {
      redirect('/');
    }
  }

  return <>{children}</>;
}
