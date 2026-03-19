import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').single();
    return error ? 'Connection failed' : 'Connected';
  } catch {
    return 'Connection failed';
  }
}

export default async function Home() {
  const supabaseStatus = await testSupabaseConnection();

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">ResumeForge</h1>
        <div className="flex items-center gap-4">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link 
              href="/sign-in"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign In
            </Link>
          </SignedOut>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Clerk Authentication:</span>
              <div className="flex items-center gap-2">
                <SignedIn>
                  <span className="text-green-600">✓ Signed In</span>
                </SignedIn>
                <SignedOut>
                  <span className="text-orange-600">○ Signed Out</span>
                </SignedOut>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Supabase Database:</span>
              <span className={supabaseStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}>
                {supabaseStatus === 'Connected' ? '✓' : '✗'} {supabaseStatus}
              </span>
            </div>
          </div>
        </div>

        <SignedIn>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Welcome back!</h3>
            <p className="text-blue-700">
              You're successfully signed in to ResumeForge. The application scaffold is complete 
              and ready for feature development.
            </p>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to ResumeForge</h3>
            <p className="text-gray-700 mb-4">
              An AI-powered resume and cover letter generator. Sign in to get started.
            </p>
            <Link 
              href="/sign-in"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}