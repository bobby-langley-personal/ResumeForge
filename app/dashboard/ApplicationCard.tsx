'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Download, Trash2, MessageSquare, ScrollText, Target, X, Eye, Lightbulb, MessageCircle, Lock } from 'lucide-react';
import FitAnalysisModal from '@/components/FitAnalysisModal';
import InterviewPrepPanel from '@/components/InterviewPrepPanel';
import ResumeChatPanel from '@/components/ResumeChatPanel';
import { FitAnalysis } from '@/types/fit-analysis';
import { computeMatchScore } from '@/lib/keyword-score';
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
  chatEnabled: boolean;
  isPro: boolean;
  interviewPrepCount: number;
  chatUnlockedCount: number;
  selected: boolean;
  isFirstCard?: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const FREE_PREP_LIMIT = 2;

export default function ApplicationCard({
  id, company, jobTitle, jobDescription, createdAt, hasCoverLetter, questionAnswers, fitAnalysis,
  chatEnabled, isPro, interviewPrepCount, chatUnlockedCount,
  selected, isFirstCard, onToggleSelect, onDelete,
}: ApplicationCardProps) {
  const [downloading, setDownloading] = useState<'resume-pdf' | 'resume-docx' | 'cover-letter-pdf' | 'cover-letter-docx' | null>(null);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [previewType, setPreviewType] = useState<'resume' | 'cover-letter' | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatCurrentResume, setChatCurrentResume] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    resumeContent: string | null;
    coverLetterContent: string | null;
    interviewPrep: InterviewPrep | null;
    chatHistory: { role: 'user' | 'assistant'; content: string; type?: 'change' | 'answer' }[] | null;
    candidateName: string;
    company: string;
    jobTitle: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [localFitAnalysis, setLocalFitAnalysis] = useState<FitAnalysis | null>(fitAnalysis);
  const [resumeMatchScore, setResumeMatchScore] = useState<number | undefined>(undefined);
  const [analysisLoading, setAnalysisLoading] = useState(false);

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
    setShowPrep(true);
    if (interviewPrep) return;
    setPrepLoading(true);
    setError('');
    try {
      // Fetch application data (resume_content + any existing interview_prep)
      let appData = previewData;
      if (!appData) {
        const res = await fetch(`/api/applications/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        appData = await res.json();
        setPreviewData(appData);
      }
      // Use existing prep if available
      if (appData?.interviewPrep) {
        setInterviewPrep(appData.interviewPrep as InterviewPrep);
        setPrepLoading(false);
        return;
      }
      const resumeContent = appData?.resumeContent;
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
      if (res.status === 402) {
        setShowPrep(false);
        setError(`Interview Prep limit reached (${FREE_PREP_LIMIT} free). Upgrade to Pro for unlimited prep.`);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const prep: InterviewPrep = await res.json();
      setInterviewPrep(prep);
    } catch {
      setError('Failed to generate interview prep. Please try again.');
    } finally {
      setPrepLoading(false);
    }
  };

  const handleRegenPrep = async () => {
    setPrepLoading(true);
    setInterviewPrep(null);
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

  const handleOpenChat = async () => {
    // Check chat entitlement before opening
    if (!isPro && !chatEnabled) {
      // Log frustrated click and show upgrade prompt via error message
      fetch('/api/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'chat_locked_click', applicationId: id }),
      }).catch(() => {});
      setError('Résumé Chat is included with your first 3 résumés. Upgrade to Pro for unlimited chat.');
      return;
    }
    setShowChat(true);
    if (previewData) {
      if (!chatCurrentResume) setChatCurrentResume(previewData.resumeContent);
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreviewData(data);
      setChatCurrentResume(data.resumeContent);
    } catch {
      setError('Failed to load resume. Please try again.');
      setShowChat(false);
    }
  };

  const handleOpenFitAnalysis = async () => {
    if (localFitAnalysis) {
      // Compute resume score from stored keywords if available
      if (localFitAnalysis.keywords && typeof localFitAnalysis.matchScore === 'number') {
        let resumeText = previewData?.resumeContent ?? null;
        if (!resumeText) {
          try {
            const res = await fetch(`/api/applications/${id}`);
            if (res.ok) {
              const data = await res.json();
              setPreviewData(data);
              resumeText = data.resumeContent;
            }
          } catch {/* non-critical */}
        }
        if (resumeText) {
          const allKw = [...localFitAnalysis.keywords.matched, ...localFitAnalysis.keywords.missing];
          const { score } = computeMatchScore(allKw, resumeText);
          setResumeMatchScore(score);
        }
      }
      setShowInsights(true);
      return;
    }
    setAnalysisLoading(true);
    setError('');
    try {
      // Need resume content as backgroundExperience for the analysis
      let appData = previewData;
      if (!appData) {
        const res = await fetch(`/api/applications/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        appData = await res.json();
        setPreviewData(appData);
      }
      const res = await fetch('/api/analyze-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          jobTitle,
          jobDescription,
          backgroundExperience: appData?.resumeContent ?? '',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const analysis: FitAnalysis = await res.json();
      setLocalFitAnalysis(analysis);
      // Dashboard fit analysis runs on the generated resume — so matchScore IS the resume score
      // No before score available in this context; resumeMatchScore stays undefined
      setShowInsights(true);
      // Save back to DB in background — don't block the modal
      fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit_analysis: analysis }),
      }).catch(() => {/* non-critical */});
    } catch {
      setError('Failed to run fit analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleDownload = async (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx') => {
    const key = `${type}-${format}` as typeof downloading;
    setDownloading(key);
    setError('');
    try {
      const route = format === 'docx' ? `/api/download-docx/${type}` : `/api/download-pdf/${type}`;
      const res = await fetch(route, {
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
      a.download = cd?.match(/filename="(.+)"/)?.[1] ?? `${type}.${format}`;
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
        <TooltipProvider delayDuration={150}>
          <div id={isFirstCard ? 'dashboard-icon-row' : undefined} className="flex items-center gap-1 shrink-0">
            {/* Chat button — locked for free users after first 3 résumés */}
            <Tooltip>
              <TooltipTrigger asChild>
                {!isPro && !chatEnabled ? (
                  <button
                    onClick={handleOpenChat}
                    aria-label="Résumé Chat included with first 3 résumés — upgrade to Pro"
                    className="relative p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <Lock className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 text-muted-foreground/60" />
                  </button>
                ) : (
                  <button
                    onClick={handleOpenChat}
                    aria-label="Refine résumé with AI chat"
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                {!isPro && !chatEnabled ? 'Chat included with first 3 résumés · Upgrade to Pro' : 'Refine résumé with AI chat'}
              </TooltipContent>
            </Tooltip>

            {/* Interview Prep button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenPrep}
                  disabled={prepLoading}
                  aria-label={
                    interviewPrep
                      ? 'View interview prep'
                      : !isPro && interviewPrepCount >= FREE_PREP_LIMIT
                        ? `Interview Prep limit reached (${FREE_PREP_LIMIT} free) — upgrade to Pro`
                        : `Generate interview prep${!isPro ? ` (${FREE_PREP_LIMIT - interviewPrepCount} remaining)` : ''}`
                  }
                  className={`relative p-1 transition-colors ${interviewPrep ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {prepLoading
                    ? <span className="w-4 h-4 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <Target className="w-4 h-4" />
                  }
                  {!isPro && !interviewPrep && interviewPrepCount >= FREE_PREP_LIMIT && (
                    <Lock className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 text-muted-foreground/60" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {interviewPrep
                  ? 'View interview prep'
                  : !isPro && interviewPrepCount >= FREE_PREP_LIMIT
                    ? `Interview Prep limit reached (${FREE_PREP_LIMIT} free) · Upgrade to Pro`
                    : `Generate interview prep${!isPro ? ` · ${FREE_PREP_LIMIT - interviewPrepCount} remaining` : ''}`
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowJD(true)}
                  aria-label="View job description"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ScrollText className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View job description</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenFitAnalysis}
                  disabled={analysisLoading}
                  aria-label={localFitAnalysis ? 'View fit analysis' : 'Run fit analysis'}
                  className={`p-1 transition-colors ${localFitAnalysis ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {analysisLoading
                    ? <span className="w-4 h-4 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <Lightbulb className="w-4 h-4" />
                  }
                </button>
              </TooltipTrigger>
              <TooltipContent>{localFitAnalysis ? 'View fit analysis' : 'Run fit analysis'}</TooltipContent>
            </Tooltip>

            {questionAnswers && questionAnswers.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowAnswers(true)}
                    aria-label={`${questionAnswers.length} application answer${questionAnswers.length > 1 ? 's' : ''}`}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{questionAnswers.length} application answer{questionAnswers.length > 1 ? 's' : ''}</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete(id)}
                  aria-label="Delete résumé"
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete résumé</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Answers modal */}
      {showAnswers && questionAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Application Answers</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowAnswers(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Close">
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
                    title="Copy this answer to clipboard"
                  >
                    {copiedIdx === i ? 'Copied!' : 'Copy Answer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col gap-2 mt-auto">
          {/* Resume download row */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => handleDownload('resume', 'pdf')} disabled={downloading !== null || loadingPreview} className="flex-1" aria-label="Download resume as PDF">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  {downloading === 'resume-pdf' ? 'Downloading…' : 'PDF'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download résumé as PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => handleDownload('resume', 'docx')} disabled={downloading !== null || loadingPreview} className="flex-1" aria-label="Download resume as Word document">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  {downloading === 'resume-docx' ? 'Downloading…' : 'DOCX'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download résumé as Word (.docx)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => handlePreview('resume')} disabled={downloading !== null || loadingPreview} className="px-2.5" aria-label="Preview résumé">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview résumé</TooltipContent>
            </Tooltip>
          </div>
          {/* Cover letter download row */}
          {hasCoverLetter && (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter', 'pdf')} disabled={downloading !== null || loadingPreview} className="flex-1" aria-label="Download cover letter as PDF">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    {downloading === 'cover-letter-pdf' ? 'Downloading…' : 'CL PDF'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download cover letter as PDF</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter', 'docx')} disabled={downloading !== null || loadingPreview} className="flex-1" aria-label="Download cover letter as Word document">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    {downloading === 'cover-letter-docx' ? 'Downloading…' : 'CL DOCX'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download cover letter as Word (.docx)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => handlePreview('cover-letter')} disabled={downloading !== null || loadingPreview} className="px-2.5" aria-label="Preview cover letter">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview cover letter</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Job Description Modal */}
      {showJD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-semibold text-foreground">Job Description</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowJD(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Close">
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
      {showPrep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Interview Prep
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
              </div>
              <button onClick={() => setShowPrep(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <InterviewPrepPanel
                prep={interviewPrep}
                applicationId={id}
                onRegenerate={handleRegenPrep}
                regenerating={prepLoading}
                loading={prepLoading && !interviewPrep}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fit Analysis Modal */}
      {showInsights && localFitAnalysis && (
        <FitAnalysisModal
          fitAnalysis={localFitAnalysis}
          company={company}
          jobTitle={jobTitle}
          createdAt={createdAt}
          resumeMatchScore={resumeMatchScore}
          onClose={() => setShowInsights(false)}
        />
      )}

      {/* Resume Chat Modal */}
      {showChat && previewData && chatCurrentResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" /> Résumé Chat
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company} — {jobTitle}</p>
                {!isPro && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {chatUnlockedCount}/3 résumés include free chat ·{' '}
                    <a href="/pricing" className="text-primary hover:underline">Upgrade to Pro</a>
                  </p>
                )}
              </div>
              <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <ResumeChatPanel
                applicationId={id}
                currentResumeText={chatCurrentResume}
                originalResumeText={previewData.resumeContent ?? chatCurrentResume}
                coverLetterText={previewData.coverLetterContent ?? undefined}
                jobDescription={jobDescription}
                company={company}
                jobTitle={jobTitle}
                onResumeUpdate={setChatCurrentResume}
                initialChatHistory={previewData.chatHistory ?? undefined}
              />
            </div>
          </div>
        </div>
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
