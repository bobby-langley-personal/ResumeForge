'use client';

import { useMemo, useState, useEffect } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { ExternalLink, FileText } from 'lucide-react';
import ResumePDF from '@/lib/pdf/ResumePDF';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';

interface Props {
  type: 'resume' | 'cover-letter';
  text: string;
  candidateName: string;
  company: string;
  jobTitle: string;
}

/** Mobile browsers (iOS Safari + Android Chrome) cannot reliably render PDF blob URLs in iframes */
function useIsMobileBrowser() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setMobile(
      /iPhone|iPad|iPod|Android/i.test(ua) ||
      // iPad Pro reports as MacIntel with touch points
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, []);
  return mobile;
}

export default function InlinePDFViewer({ type, text, candidateName, company, jobTitle }: Props) {
  // Force BlobProvider to remount when text changes — it can enter an unrecoverable
  // error state on prop changes (e.g. after undo), so we key it to get a clean instance.
  const [blobKey, setBlobKey] = useState(0);
  useEffect(() => { setBlobKey(k => k + 1); }, [text]);

  const isMobile = useIsMobileBrowser();

  const doc = useMemo(
    () =>
      type === 'resume' ? (
        <ResumePDF resumeText={text} candidateName={candidateName} company={company} jobTitle={jobTitle} />
      ) : (
        <CoverLetterPDF coverLetterText={text} candidateName={candidateName} company={company} jobTitle={jobTitle} />
      ),
    [type, text, candidateName, company, jobTitle]
  );

  return (
    <BlobProvider key={blobKey} document={doc}>
      {({ url, loading, error }) => {
        if (loading) {
          return (
            <div
              className="w-full flex items-center justify-center bg-muted/50 rounded-lg text-sm text-muted-foreground animate-pulse"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              Rendering PDF…
            </div>
          );
        }
        if (error || !url) {
          return (
            <div
              className="w-full flex items-center justify-center bg-muted rounded-lg text-sm text-destructive"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              Preview failed.
            </div>
          );
        }
        // Mobile browsers (iOS Safari, Android Chrome) silently refuse to render PDF blob URLs inside iframes.
        // Open in a new tab instead — the native PDF viewer handles it.
        if (isMobile) {
          return (
            <div
              className="w-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg border border-border"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              <FileText className="w-10 h-10 text-muted-foreground" />
              <div className="text-center px-6">
                <p className="text-sm font-medium text-foreground mb-1">PDF ready</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Inline preview isn&apos;t supported on iOS — tap below to open.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open PDF
                </a>
              </div>
            </div>
          );
        }
        return (
          <iframe
            src={`${url}#navpanes=0`}
            className="w-full rounded-lg border border-border"
            style={{ aspectRatio: '8.5 / 11' }}
            title={type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
          />
        );
      }}
    </BlobProvider>
  );
}
