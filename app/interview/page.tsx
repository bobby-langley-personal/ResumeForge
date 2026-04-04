import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import InterviewClient from './InterviewClient';

export const metadata = { title: 'Experience Interview — Easy Apply AI' };

export default async function InterviewPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <InterviewClient />
      </main>
    </div>
  );
}
