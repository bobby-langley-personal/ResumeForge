import { currentUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';

export default async function Home() {
  const user = await currentUser();
  
  // Test Supabase connection
  let supabaseStatus = 'Unknown';
  try {
    const { data, error } = await supabase.from('users').select('count').single();
    supabaseStatus = error ? 'Error' : 'Connected';
  } catch (e) {
    supabaseStatus = 'Error';
  }

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          ResumeForge
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          AI-Powered Resume & Cover Letter Generator
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">System Status</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Authentication (Clerk):</span>
              <span className={user ? 'text-green-600' : 'text-red-600'}>
                {user ? 'Signed In' : 'Signed Out'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Database (Supabase):</span>
              <span className={supabaseStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}>
                {supabaseStatus}
              </span>
            </div>
            
            {user && (
              <div className="flex justify-between items-center">
                <span>User Email:</span>
                <span className="text-blue-600">{user.primaryEmailAddress?.emailAddress}</span>
              </div>
            )}
          </div>
        </div>
        
        <div>
          {user ? (
            <SignOutButton>
              <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                Sign Out
              </button>
            </SignOutButton>
          ) : (
            <SignInButton>
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </div>
  );
}
