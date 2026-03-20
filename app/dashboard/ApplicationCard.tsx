'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2 } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offered: 'Offered',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700 border-blue-200',
  interviewing: 'bg-purple-50 text-purple-700 border-purple-200',
  offered: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface ApplicationCardProps {
  id: string;
  company: string;
  jobTitle: string;
  createdAt: string;
  hasCoverLetter: boolean;
  status: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export default function ApplicationCard({
  id, company, jobTitle, createdAt, hasCoverLetter, status,
  selected, onToggleSelect, onDelete, onStatusChange,
}: ApplicationCardProps) {
  const [downloading, setDownloading] = useState<'resume' | 'cover-letter' | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [error, setError] = useState('');

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

  const handleStatusSelect = async (newStatus: string) => {
    setEditingStatus(false);
    if (newStatus === status) return;
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) onStatusChange(id, newStatus);
  };

  return (
    <div className={`bg-card border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      {/* Header row: checkbox + title + delete */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(id)}
          className="w-4 h-4 mt-1 accent-primary shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{company}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{jobTitle}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formattedDate}
          </p>
        </div>
        <button
          onClick={() => onDelete(id)}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status badge / editor */}
      <div className="relative">
        {editingStatus ? (
          <select
            autoFocus
            defaultValue={status}
            onBlur={() => setEditingStatus(false)}
            onChange={e => handleStatusSelect(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setEditingStatus(true)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.applied}`}
            title="Click to change status"
          >
            {STATUS_LABELS[status] ?? status}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

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
