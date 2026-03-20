'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/">
              <h1 className="text-2xl font-bold text-foreground">ResumeForge</h1>
            </Link>
            <SignedIn>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Library
              </Link>
            </SignedIn>
          </div>

          <div className="flex items-center">
            <SignedOut>
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-10 h-10',
                    userButtonPopoverCard: 'bg-popover border-border',
                    userButtonPopoverText: 'text-popover-foreground',
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
