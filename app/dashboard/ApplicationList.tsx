'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2 } from 'lucide-react';
import ApplicationCard from './ApplicationCard';
import { ApplicationItem } from './page';

interface Props {
  initialItems: ApplicationItem[];
}

export default function ApplicationList({ initialItems }: Props) {
  const [items, setItems] = useState<ApplicationItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.company.toLowerCase().includes(q) || i.job_title.toLowerCase().includes(q)
    );
  }, [items, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} resume${selected.size > 1 ? 's' : ''}?`)) return;
    setDeleting(true);
    const res = await fetch('/api/applications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    if (res.ok) {
      setItems(prev => prev.filter(i => !selected.has(i.id)));
      setSelected(new Set());
    }
    setDeleting(false);
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company or job title…"
          className="pl-9"
        />
      </div>

      {/* Bulk action toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={toggleSelectAll}
          />
          {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
        </label>
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {deleting ? 'Deleting…' : `Delete ${selected.size}`}
          </Button>
        )}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-sm text-muted-foreground py-12 text-center">No resumes match "{search}"</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(app => (
          <ApplicationCard
            key={app.id}
            id={app.id}
            company={app.company}
            jobTitle={app.job_title}
            createdAt={app.created_at}
            jobDescription={app.job_description}
            hasCoverLetter={!!app.cover_letter_content}
            questionAnswers={app.question_answers ?? null}
            fitAnalysis={app.fit_analysis ?? null}
            selected={selected.has(app.id)}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
