'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Menu, X, MessageSquare, Compass, PlusCircle, Sparkles, FolderOpen } from 'lucide-react';
import { startTour } from '@/components/TourGuide';

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), { ssr: false });

const TOUR_KEY = 'resumeforge_tour_completed';

export default function Navbar() {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourShown, setTourShown] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    <>
    <nav ref={navRef} className="border-b border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo — always visible */}
          <Link href="/" onClick={close}>
            <h1 className="text-2xl font-bold text-foreground">ResumeForge</h1>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <SignedIn>
              {/* Hamburger + dropdown anchored to this button */}
              <div id="tour-nav" className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  title={menuOpen ? 'Close menu' : 'Open menu'}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href="/tailor"
                      onClick={close}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span>Tailor New Resume</span>
                      <PlusCircle className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <span>AI Resumes</span>
                      <Sparkles className="w-4 h-4" />
                    </Link>
                    <Link
                      id="tour-my-documents"
                      href="/resumes"
                      onClick={close}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <span>My Profile</span>
                      <FolderOpen className="w-4 h-4" />
                    </Link>

                    <div className="border-t border-border my-1" />

                    {tourShown && (
                      <button
                        onClick={handleTour}
                        className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <span>Take the Tour</span>
                        <Compass className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => { toggleTheme(); close(); }}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <div className="border-t border-border my-1" />

                    <button
                      onClick={() => { close(); setFeedbackOpen(true); }}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <span>Feedback</span>
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </SignedIn>

            <SignedOut>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton appearance={userButtonAppearance} />
            </SignedIn>
          </div>
        </div>
      </div>

    </nav>
    {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
