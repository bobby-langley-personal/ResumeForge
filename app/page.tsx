import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { supabaseServer } from '@/lib/supabase';

// Force dynamic rendering to avoid static generation issues with Clerk auth
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Test Supabase connection
  let dbStatus = 'Unknown';
  try {
    const supabase = await supabaseServer();
    const { error } = await supabase.from('users').select('id').limit(1);
    dbStatus = error ? `Error: ${error.message}` : 'Connected';
  } catch (err) {
    dbStatus = `Connection failed: ${err}`;
  }

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">ResumeForge</h1>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton>
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">System Status Check</h2>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Authentication:</span>
                <SignedOut>
                  <span className="text-red-600">Not signed in</span>
                </SignedOut>
                <SignedIn>
                  <span className="text-green-600">✅ Signed in successfully</span>
                </SignedIn>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Database:</span>
                <span className={`${dbStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {dbStatus === 'Connected' ? '✅' : '❌'} {dbStatus}
                </span>
              </div>
            </div>
          </div>

          <SignedOut>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Welcome to ResumeForge</h2>
              <p className="text-gray-700 mb-4">
                AI-powered resume and cover letter generator. Sign in to get started.
              </p>
              <SignInButton>
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Sign In to Continue
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Ready to Build</h2>
              <p className="text-gray-700">
                All systems are operational! The ResumeForge foundation is complete and ready for feature development.
              </p>
            </div>
          </SignedIn>
        </div>
      </main>
    </div>
  );
}
