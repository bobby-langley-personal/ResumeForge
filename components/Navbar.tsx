'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Menu, X, MessageSquare, Compass, Crown, Zap } from 'lucide-react';
import { startTour } from '@/components/TourGuide';

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), { ssr: false });

const TOUR_KEY = 'resumeforge_tour_completed';

// Primary nav destinations — shown as persistent links on desktop, in hamburger on mobile
const PRIMARY_NAV = [
  { label: 'Tailor New Résumé', href: '/tailor' },
  { label: 'My Applications', href: '/dashboard' },
  { label: 'My Experience', href: '/resumes' },
  { label: 'AI Interview', href: '/interview' },
  { label: 'Polished Résumé', href: '/polished-resume' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourShown, setTourShown] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [billing, setBilling] = useState<{ subscription_status: string; tailored_resume_count: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setTourShown(localStorage.getItem(TOUR_KEY) === 'true');
    fetch('/api/billing/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBilling(d); })
      .catch(() => {});
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

  const isPro = billing?.subscription_status === 'pro';
  const hasUsed = billing && billing.tailored_resume_count >= 1;

  // Shared billing / utility menu items (appear in both desktop dropdown and mobile hamburger)
  const BillingMenuItem = () => {
    if (isPro) {
      return (
        <button
          onClick={async () => {
            close();
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const { url } = await res.json();
            if (url) window.location.href = url;
          }}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <span>Manage Subscription</span>
          <Crown className="w-4 h-4" />
        </button>
      );
    }
    if (hasUsed) {
      return (
        <Link
          href="/pricing"
          onClick={close}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-blue-500 hover:bg-muted transition-colors"
        >
          <span>Upgrade to Pro</span>
          <Zap className="w-4 h-4" />
        </Link>
      );
    }
    return null;
  };

  return (
    <>
    <nav ref={navRef} className="border-b border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo — always visible */}
          <a href="/" onClick={close} className="shrink-0">
            <h1 className="text-2xl font-bold text-foreground">
              Easy Apply<sup className="text-blue-500 text-xs font-bold ml-0.5 align-super">AI</sup>
            </h1>
          </a>

          {/* Desktop primary nav — hidden on mobile */}
          <SignedIn>
            <div className="hidden md:flex items-center gap-1 mx-4">
              {PRIMARY_NAV.map(({ label, href }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </SignedIn>

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0">
            <SignedIn>
              {/* Desktop account dropdown */}
              <div id="tour-nav" className="hidden md:block relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                    <BillingMenuItem />
                    {(isPro || hasUsed) && <div className="border-t border-border my-1" />}

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

              {/* Mobile hamburger — all nav + utilities */}
              <div className="md:hidden relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                    {/* Primary nav links in mobile */}
                    {PRIMARY_NAV.map(({ label, href }) => (
                      <Link
                        key={href}
                        href={href}
                        id={href === '/resumes' ? 'tour-my-documents' : undefined}
                        onClick={close}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {label}
                      </Link>
                    ))}

                    <div className="border-t border-border my-1" />
                    <BillingMenuItem />
                    {(isPro || hasUsed) && <div className="border-t border-border my-1" />}

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
