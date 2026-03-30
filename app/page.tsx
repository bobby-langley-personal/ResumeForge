import { auth, currentUser } from '@clerk/nextjs/server';
import { SignedOut, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { supabaseServer } from '@/lib/supabase';
import HomeRouter from '@/components/HomeRouter';

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to ResumeForge</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                AI-powered resume and cover letter generator. Create tailored documents for every job application.
              </p>
              <SignedOut>
                <SignInButton>
                  <Button size="lg">Sign In to Get Started</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const user = await currentUser();
  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? null;

  const supabase = supabaseServer();
  const [docsResult, appsResult] = await Promise.all([
    supabase
      .from('resumes')
      .select('id')
      .eq('user_id', userId),
    supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
  ]);

  const documents = docsResult.data ?? [];
  const hasDocuments = documents.length > 0;
  const hasApplications = (appsResult.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HomeRouter
          firstName={firstName}
          hasDocuments={hasDocuments}
          hasApplications={hasApplications}
        />
      </main>
    </div>
  );
}
