import { SignIn } from '@clerk/nextjs';

// Force dynamic rendering to avoid static generation issues with Clerk auth
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}