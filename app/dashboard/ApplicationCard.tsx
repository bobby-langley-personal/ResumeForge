'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface ApplicationCardProps {
  id: string;
  company: string;
  jobTitle: string;
  createdAt: string;
  hasCoverLetter: boolean;
}

export default function ApplicationCard({
  id,
  company,
  jobTitle,
  createdAt,
  hasCoverLetter,
}: ApplicationCardProps) {
  const [downloading, setDownloading] = useState<'resume' | 'cover-letter' | null>(null);
  const [error, setError] = useState('');

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{company}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{jobTitle}</p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {formattedDate}
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 mt-auto">
        <Button
          size="sm"
          onClick={() => handleDownload('resume')}
          disabled={downloading !== null}
          className="w-full"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          {downloading === 'resume' ? 'Downloading…' : 'Download Resume'}
        </Button>

        {hasCoverLetter && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload('cover-letter')}
            disabled={downloading !== null}
            className="w-full"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            {downloading === 'cover-letter' ? 'Downloading…' : 'Download Cover Letter'}
          </Button>
        )}
      </div>
    </div>
  );
}
