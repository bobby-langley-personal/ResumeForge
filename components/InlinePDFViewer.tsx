'use client';

import { useMemo } from 'react';
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
    <BlobProvider document={doc}>
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
            src={url}
            className="w-full rounded-lg border border-border"
            style={{ aspectRatio: '8.5 / 11' }}
            title={type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
          />
        );
      }}
    </BlobProvider>
  );
}
