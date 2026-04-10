'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare } from 'lucide-react';

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), { ssr: false });

export default function Footer() {
  const [open, setOpen] = useState(false);
  const [extVersion, setExtVersion] = useState<string | null>(null);
  useEffect(() => {
    // Retry a few times — content script may arrive just after React hydration
    const check = () => document.documentElement.getAttribute('data-easy-apply-ext');
    const v = check();
    if (v) { setExtVersion(v); return; }
    let attempts = 0;
    const t = setInterval(() => {
      const v2 = check();
      if (v2 || ++attempts >= 10) { if (v2) setExtVersion(v2); clearInterval(t); }
    }, 200);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Built by{' '}
            <a
              href="https://bobbylangley.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Bobby Langley
            </a>
            <span className="opacity-40">
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}
            </span>
            {process.env.NODE_ENV === 'development' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-500 leading-none">
                dev
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500 leading-none">
                live
              </span>
            )}
            {extVersion && (
              <span className="opacity-40">
                ext v{extVersion}
              </span>
            )}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Send feedback or report an issue"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback
          </button>
        </div>
      </footer>

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
