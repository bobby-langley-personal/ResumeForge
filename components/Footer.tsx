'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare } from 'lucide-react';

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), { ssr: false });

export default function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Built by{' '}
            <a
              href="https://bobbylangley.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Bobby Langley
            </a>
            {process.env.NEXT_PUBLIC_APP_VERSION && (
              <span className="ml-2 opacity-40">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
            )}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
