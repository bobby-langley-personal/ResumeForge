'use client';

import { useMemo, useState, useEffect } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import ResumePDF from '@/lib/pdf/ResumePDF';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';

interface Props {
  type: 'resume' | 'cover-letter';
  text: string;
  candidateName: string;
  company: string;
  jobTitle: string;
}

export default function InlinePDFViewer({ type, text, candidateName, company, jobTitle }: Props) {
  // Force BlobProvider to remount when text changes — it can enter an unrecoverable
  // error state on prop changes (e.g. after undo), so we key it to get a clean instance.
  const [blobKey, setBlobKey] = useState(0);
  useEffect(() => { setBlobKey(k => k + 1); }, [text]);

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
