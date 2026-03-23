'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, MessageSquare, X } from 'lucide-react';

interface ApplicationCardProps {
  id: string;
  company: string;
  jobTitle: string;
  createdAt: string;
  hasCoverLetter: boolean;
  questionAnswers: { question: string; answer: string }[] | null;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export default function ApplicationCard({
  id, company, jobTitle, createdAt, hasCoverLetter, questionAnswers,
  selected, onToggleSelect, onDelete,
}: ApplicationCardProps) {
  const [downloading, setDownloading] = useState<'resume' | 'cover-letter' | null>(null);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyAnswer = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

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
        <Button size="sm" onClick={() => handleDownload('resume')} disabled={downloading !== null} className="w-full">
          <Download className="w-3.5 h-3.5 mr-2" />
          {downloading === 'resume' ? 'Downloading…' : 'Download Resume'}
        </Button>
        {hasCoverLetter && (
          <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter')} disabled={downloading !== null} className="w-full">
            <Download className="w-3.5 h-3.5 mr-2" />
            {downloading === 'cover-letter' ? 'Downloading…' : 'Download Cover Letter'}
          </Button>
        )}
      </div>
    </div>
  );
}
