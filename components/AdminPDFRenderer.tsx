'use client';

import { createElement } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';
import ResumePDF from '@/lib/pdf/ResumePDF';

interface Props {
  type: 'resume' | 'cover_letter';
  content: string;
  candidateName: string;
  company: string;
  jobTitle: string;
}

export default function AdminPDFRenderer({ type, content, candidateName, company, jobTitle }: Props) {
  const doc = type === 'cover_letter'
    ? createElement(CoverLetterPDF, { coverLetterText: content, candidateName, company, jobTitle })
    : createElement(ResumePDF, { resumeText: content, candidateName, company, jobTitle });

  return (
    <BlobProvider document={doc as React.ReactElement<any>}>
      {({ url, loading, error }) => {
        if (loading) {
          return (
            <div className="flex items-center justify-center h-32 gap-2 text-zinc-600 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering PDF…
            </div>
          );
        }
        if (error || !url) {
          return (
            <div className="flex items-center justify-center h-16 text-red-400 text-xs">
              Failed to render PDF
            </div>
          );
        }
        return (
          <iframe
            src={`${url}#navpanes=0`}
            className="w-full border-0"
            style={{ height: '600px' }}
            title={`${type === 'cover_letter' ? 'Cover Letter' : 'Resume'} Preview`}
          />
        );
      }}
    </BlobProvider>
  );
}
