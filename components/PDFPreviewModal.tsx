'use client';

import { useState, useEffect } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { Download, X, ExternalLink, FileText } from 'lucide-react';
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(
      /iPhone|iPad|iPod|Android/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, []);

  const slug = (s: string) => s.replace(/\bat\b/gi, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const filename =
    props.type === 'resume'
      ? `Resume_${slug(props.company)}_${slug(props.jobTitle)}.pdf`
      : `Cover_Letter_${slug(props.company)}_${slug(props.jobTitle)}.pdf`;

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
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground">
            {props.type === 'resume' ? 'Resume Preview' : 'Cover Letter Preview'}
          </h3>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a
                href={blobUrl}
                download={filename}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-xl">
          <BlobProvider document={document}>
            {({ url, loading, error }) => {
              if (url && url !== blobUrl) setBlobUrl(url);
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
              // Mobile browsers cannot render PDF blob URLs in iframes — open in new tab instead
              if (isMobile) {
                return (
                  <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">PDF ready</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Inline preview isn&apos;t supported on iOS — tap below to open in Safari.
                      </p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg"
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
