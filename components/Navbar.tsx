'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Menu, X, MessageSquare } from 'lucide-react';
import { startTour } from '@/components/TourGuide';

const TOUR_KEY = 'resumeforge_tour_completed';

export default function Navbar() {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourShown, setTourShown] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setTourShown(localStorage.getItem(TOUR_KEY) === 'true');
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleTour = () => {
    setMenuOpen(false);
    localStorage.removeItem(TOUR_KEY);
    startTour();
  };

  const close = () => setMenuOpen(false);

  const userButtonAppearance = {
    elements: {
      userButtonAvatarBox: 'w-10 h-10',
      userButtonPopoverCard: 'bg-popover border-border',
      userButtonPopoverText: 'text-popover-foreground',
    },
  };

  return (
    <nav ref={navRef} className="border-b border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo — always visible */}
          <Link href="/" onClick={close}>
            <h1 className="text-2xl font-bold text-foreground">ResumeForge</h1>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <SignedIn>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                AI Resumes
              </Link>
              <Link id="tour-my-documents" href="/resumes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                My Documents
              </Link>
            </SignedIn>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            <SignedIn>
              {tourShown && (
                <button
                  onClick={handleTour}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
                  title="Replay the onboarding tour"
                >
                  ? Tour
                </button>
              )}
            </SignedIn>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <SignedOut>
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton appearance={userButtonAppearance} />
            </SignedIn>
          </div>

          {/* Mobile right side — hamburger + avatar */}
          <div className="flex md:hidden items-center gap-2">
            <SignedOut>
              <SignInButton>
                <Button variant="outline" size="sm">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <UserButton appearance={userButtonAppearance} />
            </SignedIn>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-background border-b border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <SignedIn>
              <Link
                href="/dashboard"
                onClick={close}
                className="flex items-center w-full px-2 py-3 text-sm text-foreground hover:text-primary transition-colors"
              >
                AI Resumes
              </Link>
              <Link
                href="/resumes"
                onClick={close}
                className="flex items-center w-full px-2 py-3 text-sm text-foreground hover:text-primary transition-colors"
              >
                My Documents
              </Link>

              <div className="border-t border-border my-1" />

              {tourShown && (
                <button
                  onClick={handleTour}
                  className="flex items-center w-full px-2 py-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  Take the Tour
                </button>
              )}
              <button
                onClick={() => { toggleTheme(); close(); }}
                className="flex items-center justify-between w-full px-2 py-3 text-sm text-foreground hover:text-primary transition-colors"
              >
                <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="border-t border-border my-1" />

              <a
                href="https://github.com/bobby-langley-personal/ResumeForge/issues"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center justify-between w-full px-2 py-3 text-sm text-foreground hover:text-primary transition-colors"
              >
                <span>Feedback</span>
                <MessageSquare className="w-4 h-4" />
              </a>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
