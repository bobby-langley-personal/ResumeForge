'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { startTour } from '@/components/TourGuide';

const TOUR_KEY = 'resumeforge_tour_completed';

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Read current state from the DOM (set by the layout script)
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function TourButton() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(localStorage.getItem(TOUR_KEY) === 'true');
  }, []);

  if (!shown) return null;

  const handleClick = () => {
    localStorage.removeItem(TOUR_KEY);
    startTour();
  };

  return (
    <button
      onClick={handleClick}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
      title="Replay the onboarding tour"
    >
      ? Tour
    </button>
  );
}

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
                <span className="hidden sm:inline">AI Resumes</span>
                <span className="sm:hidden">Resumes</span>
              </Link>
              <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="hidden sm:inline">My Documents</span>
                <span className="sm:hidden">Docs</span>
              </Link>
            </SignedIn>
          </div>

          <div className="flex items-center gap-2">
            <SignedIn>
              <TourButton />
            </SignedIn>
            <ThemeToggle />
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
