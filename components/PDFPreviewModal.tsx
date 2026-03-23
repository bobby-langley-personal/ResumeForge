'use client';

import { BlobProvider } from '@react-pdf/renderer';
import { X } from 'lucide-react';
import ResumePDF from '@/lib/pdf/ResumePDF';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';

type ResumePreviewProps = {
  type: 'resume';
  resumeText: string;
  candidateName: string;
  company: string;
  jobTitle: string;
};

type CoverLetterPreviewProps = {
  type: 'cover-letter';
  coverLetterText: string;
  candidateName: string;
  company: string;
  jobTitle: string;
};

type PDFPreviewModalProps = (ResumePreviewProps | CoverLetterPreviewProps) & {
  onClose: () => void;
};

export default function PDFPreviewModal(props: PDFPreviewModalProps) {
  const { onClose } = props;

  const document =
    props.type === 'resume' ? (
      <ResumePDF
        resumeText={props.resumeText}
        candidateName={props.candidateName}
        company={props.company}
        jobTitle={props.jobTitle}
      />
    ) : (
      <CoverLetterPDF
        coverLetterText={props.coverLetterText}
        candidateName={props.candidateName}
        company={props.company}
        jobTitle={props.jobTitle}
      />
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground">
            {props.type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-xl">
          <BlobProvider document={document}>
            {({ url, loading, error }) => {
              if (loading) {
                return (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Generating preview…
                  </div>
                );
              }
              if (error || !url) {
                return (
                  <div className="flex items-center justify-center h-full text-sm text-destructive">
                    Preview failed. Try downloading instead.
                  </div>
                );
              }
              return (
                <iframe
                  src={url}
                  className="w-full h-full rounded-b-xl"
                  title={props.type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
                />
              );
            }}
          </BlobProvider>
        </div>
      </div>
    </div>
  );
}
