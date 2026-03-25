'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, MessageSquare, ScrollText, Target, X, Eye, Lightbulb } from 'lucide-react';
import FitAnalysisModal from '@/components/FitAnalysisModal';
import InterviewPrepPanel from '@/components/InterviewPrepPanel';
import { FitAnalysis } from '@/types/fit-analysis';
import { InterviewPrep } from '@/types/interview-prep';

const PDFPreviewModal = dynamic(() => import('@/components/PDFPreviewModal'), { ssr: false });

function FormattedJD({ text }: { text: string }) {
  // Each </p>, </div>, </h*> becomes \n during scraping; \n\n = real block boundary.
  // Trim lines, collapse 3+ newlines, then split on those real boundaries.
  const blocks = text
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .split(/\n\n+/)
    .filter(b => b.trim());

  const bulletRe = /^[\u2022\-\*\u25e6\u2013]|\d+\.\s/;

  return (
    <div className="space-y-4 text-sm">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        // Section header: single short line ending with colon, or short all-caps
        if (
          lines.length === 1 &&
          lines[0].length < 80 &&
          (lines[0].endsWith(':') || lines[0] === lines[0].toUpperCase())
        ) {
          return <p key={i} className="font-semibold text-foreground pt-1">{lines[0]}</p>;
        }

        // Separate bullet lines from prose lines within this block
        const bulletLines = lines.filter(l => bulletRe.test(l));
        const proseLines  = lines.filter(l => !bulletRe.test(l));

        // Pure bullet block
        if (bulletLines.length === lines.length) {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2 text-muted-foreground">
                  <span className="text-muted-foreground/50 shrink-0 mt-0.5">•</span>
                  <span>{l.replace(/^[\u2022\-\*\u25e6\u2013]\s*|\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Mixed block: prose header lines + bullets underneath
        return (
          <div key={i} className="space-y-1.5">
            {proseLines.length > 0 && (
              <p className="text-muted-foreground leading-relaxed">
                {proseLines.join(' ')}
              </p>
            )}
            {bulletLines.length > 0 && (
              <ul className="space-y-1 pl-1">
                {bulletLines.map((l, j) => (
                  <li key={j} className="flex gap-2 text-muted-foreground">
                    <span className="text-muted-foreground/50 shrink-0 mt-0.5">•</span>
                    <span>{l.replace(/^[\u2022\-\*\u25e6\u2013]\s*|\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ApplicationCardProps {
  id: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  createdAt: string;
  hasCoverLetter: boolean;
  questionAnswers: { question: string; answer: string }[] | null;
  fitAnalysis: FitAnalysis | null;
  interviewPrep: InterviewPrep | null;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export default function ApplicationCard({
  id, company, jobTitle, jobDescription, createdAt, hasCoverLetter, questionAnswers, fitAnalysis, interviewPrep: initialInterviewPrep,
  selected, onToggleSelect, onDelete,
}: ApplicationCardProps) {
  const [downloading, setDownloading] = useState<'resume' | 'cover-letter' | null>(null);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(initialInterviewPrep);
  const [prepLoading, setPrepLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [previewType, setPreviewType] = useState<'resume' | 'cover-letter' | null>(null);
  const [previewData, setPreviewData] = useState<{
    resumeContent: string | null;
    coverLetterContent: string | null;
    candidateName: string;
    company: string;
    jobTitle: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const copyAnswer = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const handlePreview = async (type: 'resume' | 'cover-letter') => {
    setError('');
    if (previewData) {
      setPreviewType(type);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreviewData(data);
      setPreviewType(type);
    } catch {
      setError('Preview failed. Please try again.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenPrep = async () => {
    if (interviewPrep) { setShowPrep(true); return; }
    // Need resume content to generate — fetch it then call interview-prep
    setPrepLoading(true);
    setError('');
    try {
      let resumeContent = previewData?.resumeContent ?? null;
      if (!resumeContent) {
        const res = await fetch(`/api/applications/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPreviewData(data);
        resumeContent = data.resumeContent;
      }
      if (!resumeContent) throw new Error('No resume content');
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: id,
          jobTitle,
          company,
          jobDescription,
          generatedResume: resumeContent,
          toughQuestions: questionAnswers?.map(qa => qa.question),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const prep: InterviewPrep = await res.json();
      setInterviewPrep(prep);
      setShowPrep(true);
    } catch {
      setError('Failed to generate interview prep. Please try again.');
    } finally {
      setPrepLoading(false);
    }
  };

  const handleRegenPrep = async () => {
    setPrepLoading(true);
    setError('');
    try {
      let resumeContent = previewData?.resumeContent ?? null;
      if (!resumeContent) {
        const res = await fetch(`/api/applications/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPreviewData(data);
        resumeContent = data.resumeContent;
      }
      if (!resumeContent) throw new Error('No resume content');
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: id,
          jobTitle,
          company,
          jobDescription,
          generatedResume: resumeContent,
          toughQuestions: questionAnswers?.map(qa => qa.question),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const prep: InterviewPrep = await res.json();
      setInterviewPrep(prep);
    } catch {
      setError('Failed to regenerate. Please try again.');
    } finally {
      setPrepLoading(false);
    }
  };

  const handleDownload = async (type: 'resume' | 'cover-letter') => {
    setDownloading(type);
    setError('');
    try {
      const res = await fetch(`/api/download-pdf/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      a.download = cd?.match(/filename="(.+)"/)?.[1] ?? `${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className={`bg-card border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(id)}
          className="w-4 h-4 mt-1 accent-primary shrink-0 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{company}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{jobTitle}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpenPrep}
            disabled={prepLoading}
            className={`p-1 transition-colors ${interviewPrep ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'}`}
            title={interviewPrep ? 'View interview prep' : 'Generate interview prep'}
          >
            {prepLoading ? <span className="w-4 h-4 block animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Target className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowJD(true)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="View job description"
          >
            <ScrollText className="w-4 h-4" />
          </button>
          <button
            onClick={() => fitAnalysis && setShowInsights(true)}
            disabled={!fitAnalysis}
            className={`p-1 transition-colors ${fitAnalysis ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-600 cursor-not-allowed'}`}
            title={fitAnalysis ? 'View fit analysis' : 'No insights available for this application'}
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          {questionAnswers && questionAnswers.length > 0 && (
            <button
              onClick={() => setShowAnswers(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title={`${questionAnswers.length} application answer${questionAnswers.length > 1 ? 's' : ''}`}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Answers modal */}
      {showAnswers && questionAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAnswers(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Application Answers</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowAnswers(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {questionAnswers.map((qa, i) => (
                <div key={i} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-foreground">{qa.question}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{wordCount(qa.answer)} words</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{qa.answer}</p>
                  <button
                    onClick={() => copyAnswer(qa.answer, i)}
                    className="text-xs text-primary hover:underline"
                  >
                    {copiedIdx === i ? 'Copied!' : 'Copy Answer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleDownload('resume')} disabled={downloading !== null || loadingPreview} className="flex-1">
            <Download className="w-3.5 h-3.5 mr-2" />
            {downloading === 'resume' ? 'Downloading…' : 'Resume'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handlePreview('resume')} disabled={downloading !== null || loadingPreview} className="px-2.5" title="Preview Resume">
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
        {hasCoverLetter && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter')} disabled={downloading !== null || loadingPreview} className="flex-1">
              <Download className="w-3.5 h-3.5 mr-2" />
              {downloading === 'cover-letter' ? 'Downloading…' : 'Cover Letter'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreview('cover-letter')} disabled={downloading !== null || loadingPreview} className="px-2.5" title="Preview Cover Letter">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Job Description Modal */}
      {showJD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowJD(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-semibold text-foreground">Job Description</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowJD(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <FormattedJD text={jobDescription} />
            </div>
          </div>
        </div>
      )}

      {/* Interview Prep Modal */}
      {showPrep && interviewPrep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPrep(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Interview Prep
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowPrep(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <InterviewPrepPanel
                prep={interviewPrep}
                applicationId={id}
                onRegenerate={handleRegenPrep}
                regenerating={prepLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fit Analysis Modal */}
      {showInsights && fitAnalysis && (
        <FitAnalysisModal
          fitAnalysis={fitAnalysis}
          company={company}
          jobTitle={jobTitle}
          createdAt={createdAt}
          onClose={() => setShowInsights(false)}
        />
      )}

      {/* PDF Preview Modal */}
      {previewType && previewData && (
        previewType === 'resume' && previewData.resumeContent ? (
          <PDFPreviewModal
            type="resume"
            resumeText={previewData.resumeContent}
            candidateName={previewData.candidateName}
            company={previewData.company}
            jobTitle={previewData.jobTitle}
            onClose={() => setPreviewType(null)}
          />
        ) : previewType === 'cover-letter' && previewData.coverLetterContent ? (
          <PDFPreviewModal
            type="cover-letter"
            coverLetterText={previewData.coverLetterContent}
            candidateName={previewData.candidateName}
            company={previewData.company}
            jobTitle={previewData.jobTitle}
            onClose={() => setPreviewType(null)}
          />
        ) : null
      )}
    </div>
  );
}
