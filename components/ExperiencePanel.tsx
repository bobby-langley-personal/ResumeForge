'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { FileText, Upload, ChevronDown, ChevronUp, AlertTriangle, FolderOpen, Loader2 } from 'lucide-react';
import { ResumeItem, ITEM_TYPE_LABELS } from '@/types/resume';

interface Props {
  onBackgroundChange: (text: string, sourceName: string) => void;
  onAdditionalContextChange: (items: ResumeItem[]) => void;
  disabled?: boolean;
  usingBaseResume?: boolean;
}

export default function ExperiencePanel({
  onBackgroundChange,
  onAdditionalContextChange,
  disabled,
  usingBaseResume,
}: Props) {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [additionalIds, setAdditionalIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/resumes')
      .then(r => r.ok ? r.json() : [])
      .then((data: ResumeItem[]) => {
        const filtered = data;
        setItems(filtered);
        setLoaded(true);
        const defaultItem = filtered.find(i => i.is_default) ?? filtered[0] ?? null;
        if (defaultItem) {
          setSelectedId(defaultItem.id);
          // Don't call onBackgroundChange here — base resume auto-load in tailor page handles primary
        }
        const nonDefault = filtered.filter(i => !i.is_default);
        if (nonDefault.length > 0) {
          setAdditionalIds(new Set(nonDefault.map(i => i.id)));
          onAdditionalContextChange(nonDefault);
        }
        // Start collapsed if docs exist, expanded if no docs
        setExpanded(filtered.length === 0);
      })
      .catch(() => {
        setLoaded(true);
        setExpanded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrimaryChange = (id: string) => {
    setSelectedId(id);
    setUploadedFileName('');
    const item = items.find(i => i.id === id);
    if (item) onBackgroundChange(item.content.text, item.title);
  };

  const toggleAdditional = (item: ResumeItem) => {
    const next = new Set(additionalIds);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    setAdditionalIds(next);
    onAdditionalContextChange(items.filter(i => next.has(i.id)));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-resume', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setUploadedFileName(result.fileName);
      setSelectedId(''); // deselect library item
      onBackgroundChange(result.text, result.fileName);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!loaded) return null;

  const selectedItem = items.find(i => i.id === selectedId);
  const additionalCount = additionalIds.size;

  // Build summary line
  let primaryLabel = '';
  if (usingBaseResume) {
    primaryLabel = 'Base Resume (auto-loaded)';
  } else if (uploadedFileName) {
    const short = uploadedFileName.length > 30 ? uploadedFileName.slice(0, 30) + '…' : uploadedFileName;
    primaryLabel = short;
  } else if (selectedItem) {
    const name = selectedItem.title.length > 30 ? selectedItem.title.slice(0, 30) + '…' : selectedItem.title;
    primaryLabel = `${name}${selectedItem.is_default ? ' (default)' : ''}`;
  }

  const hasBackground = !!(usingBaseResume || uploadedFileName || selectedItem);
  const extras = items.filter(i => i.id !== selectedId);

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      {/* Summary bar */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasBackground ? (
            <FileText className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <div className="text-left min-w-0">
            <span className="font-medium text-foreground">
              {hasBackground ? 'Using' : 'No experience loaded'}
            </span>
            {hasBackground && primaryLabel && (
              <span className="ml-2 text-muted-foreground font-normal truncate">
                {primaryLabel}
                {additionalCount > 0 && ` · +${additionalCount} doc${additionalCount > 1 ? 's' : ''}`}
              </span>
            )}
            {!hasBackground && (
              <span className="ml-2 text-amber-600 font-normal">Add your background before generating</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3">
          {expanded ? (
            <><span>Done</span><ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <><span>{hasBackground ? 'Edit' : 'Add'}</span><ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Primary document */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Primary document
            </label>

            {items.length > 0 ? (
              <select
                value={selectedId}
                onChange={e => handlePrimaryChange(e.target.value)}
                disabled={disabled}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— select saved document —</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title} {item.is_default ? '(default)' : ''} · {ITEM_TYPE_LABELS[item.item_type]}
                  </option>
                ))}
              </select>
            ) : (
              <div id="tour-context" className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-sm">
                <FolderOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground leading-snug">
                  Save your resume to{' '}
                  <Link href="/resumes" className="text-primary hover:underline font-medium">
                    My Profile
                  </Link>{' '}
                  and it will auto-load here every time.
                </p>
              </div>
            )}
          </div>

          {/* Upload a file */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upload a file
            </label>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                disabled={disabled || isUploading}
                className="hidden"
                id="exp-panel-file"
              />
              <label
                htmlFor="exp-panel-file"
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/40 transition-colors ${(disabled || isUploading) ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload PDF or DOCX</>
                )}
              </label>
              {uploadedFileName && !isUploading && (
                <p className="mt-1.5 text-xs text-green-600">Loaded: {uploadedFileName}</p>
              )}
              {uploadError && (
                <p className="mt-1.5 text-xs text-destructive">{uploadError}</p>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">Session only — won&apos;t be saved to your profile</p>
            </div>
          </div>

          {/* Additional context */}
          {extras.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Additional context <span className="font-normal normal-case">(optional)</span>
              </label>
              <div className="space-y-1.5">
                {extras.map(item => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={additionalIds.has(item.id)}
                      onChange={() => toggleAdditional(item)}
                      disabled={disabled}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">· {ITEM_TYPE_LABELS[item.item_type]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Link to My Documents */}
          <Link href="/resumes" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <FolderOpen className="w-3.5 h-3.5" />
            Go to My Profile to manage your saved files
          </Link>
        </div>
      )}
    </div>
  );
}
