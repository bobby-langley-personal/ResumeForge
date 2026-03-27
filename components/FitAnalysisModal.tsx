'use client';

import { useEffect, useState } from 'react';
import { X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FitAnalysis, FitPoint } from '@/types/fit-analysis';

const FIT_COLORS: Record<string, string> = {
  'Strong Fit':  'text-green-700 bg-green-50 border-green-200',
  'Good Fit':    'text-blue-700 bg-blue-50 border-blue-200',
  'Stretch Role':'text-amber-700 bg-amber-50 border-amber-200',
};

const PREVIEW_COUNT = 3;

interface Props {
  fitAnalysis: FitAnalysis;
  company: string;
  jobTitle: string;
  createdAt?: string;
  /** On the home page, the close button resets the form instead */
  onClose: () => void;
  /** Extra actions rendered below the analysis (e.g. "Generate Resume" button) */
  actions?: React.ReactNode;
}

function FitSection({
  title,
  items,
  icon,
  titleColor,
  iconColor,
  renderItem,
}: {
  title: string;
  items: unknown[];
  icon: string;
  titleColor: string;
  iconColor: string;
  renderItem: (item: unknown, i: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <h3 className={`text-sm font-semibold ${titleColor} mb-2`}>{title}</h3>
      <ul className="space-y-1">
        {visible.map((item, i) => renderItem(item, i))}
      </ul>
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show {items.length - PREVIEW_COUNT} more</>
          )}
        </button>
      )}
    </div>
  );
}

export default function FitAnalysisModal({ fitAnalysis, company, jobTitle, createdAt, onClose, actions }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const isValid = fitAnalysis?.strengths && fitAnalysis?.gaps && fitAnalysis?.suggestions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Fit Analysis</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {jobTitle} at {company}{formattedDate ? ` · ${formattedDate}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isValid ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              💡 Insights unavailable for this application.
            </p>
          ) : (
            <>
              {/* Overall Fit Badge */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-semibold ${FIT_COLORS[fitAnalysis.overallFit] ?? 'text-foreground bg-muted border-border'}`}>
                {fitAnalysis.overallFit}
              </div>

              {/* Sections */}
              <div className="grid grid-cols-1 gap-4">
                <FitSection
                  title="Strengths"
                  items={fitAnalysis.strengths}
                  icon="✓"
                  titleColor="text-green-700"
                  iconColor="text-green-600"
                  renderItem={(item, i) => {
                    const s = item as FitPoint;
                    return (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{s.point}{s.source && <span className="ml-1 text-xs italic opacity-50">({s.source})</span>}</span>
                      </li>
                    );
                  }}
                />

                <FitSection
                  title="Gaps"
                  items={fitAnalysis.gaps}
                  icon="✗"
                  titleColor="text-red-700"
                  iconColor="text-red-500"
                  renderItem={(item, i) => {
                    const g = item as FitPoint;
                    return (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span>{g.point}{g.source && <span className="ml-1 text-xs italic opacity-50">({g.source})</span>}</span>
                      </li>
                    );
                  }}
                />

                <FitSection
                  title="Suggestions"
                  items={fitAnalysis.suggestions}
                  icon="→"
                  titleColor="text-blue-700"
                  iconColor="text-blue-500"
                  renderItem={(item, i) => {
                    const s = item as FitPoint;
                    return (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span>{s.point}{s.source && <span className="ml-1 text-xs italic opacity-50">({s.source})</span>}</span>
                      </li>
                    );
                  }}
                />

                {fitAnalysis.plannedImprovements?.length > 0 && (
                  <FitSection
                    title="Planned Improvements"
                    items={fitAnalysis.plannedImprovements}
                    icon="✦"
                    titleColor="text-orange-600"
                    iconColor="text-orange-500"
                    renderItem={(item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-orange-500 mt-0.5">✦</span>
                        <span>{item as string}</span>
                      </li>
                    )}
                  />
                )}
              </div>

              {/* Actions slot (home page) or default close button (dashboard) */}
              {actions ?? (
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={onClose} title="Close this analysis">Close</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
