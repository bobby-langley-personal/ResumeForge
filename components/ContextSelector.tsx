'use client';

import { useEffect, useState } from 'react';
import { ResumeItem, ITEM_TYPE_LABELS } from '@/types/resume';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onLoadBackground: (text: string) => void;
  onAdditionalContextChange: (items: ResumeItem[]) => void;
  disabled?: boolean;
}

export default function ContextSelector({ onLoadBackground, onAdditionalContextChange, disabled }: Props) {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [additionalIds, setAdditionalIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/resumes')
      .then(r => r.ok ? r.json() : [])
      .then((data: ResumeItem[]) => {
        setItems(data);
        setLoaded(true);
        const defaultItem = data.find(i => i.is_default);
        if (defaultItem) {
          setSelectedId(defaultItem.id);
          onLoadBackground(defaultItem.content.text);
        }
        // Pre-select up to 3 most recent non-default items as additional context
        const nonDefault = data.filter(i => !i.is_default).slice(0, 3);
        if (nonDefault.length > 0) {
          setAdditionalIds(new Set(nonDefault.map(i => i.id)));
          setExpanded(true);
          onAdditionalContextChange(nonDefault);
        }
      })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrimaryChange = (id: string) => {
    setSelectedId(id);
    const item = items.find(i => i.id === id);
    if (item) onLoadBackground(item.content.text);
  };

  const toggleAdditional = (item: ResumeItem) => {
    const next = new Set(additionalIds);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    setAdditionalIds(next);
    onAdditionalContextChange(items.filter(i => next.has(i.id)));
  };

  if (!loaded || items.length === 0) return null;

  const extras = items.filter(i => i.id !== selectedId);

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <BookOpen className="w-4 h-4" />
        Load from My Documents
      </div>

      {/* Primary background selector */}
      <select
        value={selectedId}
        onChange={e => handlePrimaryChange(e.target.value)}
        disabled={disabled}
        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">— select saved item —</option>
        {items.map(item => (
          <option key={item.id} value={item.id}>
            {item.title} {item.is_default ? '(default)' : ''} · {ITEM_TYPE_LABELS[item.item_type]}
          </option>
        ))}
      </select>

      {/* Additional context accordion */}
      {extras.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Additional context for AI ({additionalIds.size} selected)
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Selected items are appended to the AI prompt as extra context (cover letter examples, portfolios, etc.)
              </p>
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
          )}
        </div>
      )}
    </div>
  );
}
