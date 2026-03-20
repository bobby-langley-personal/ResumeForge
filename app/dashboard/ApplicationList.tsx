'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import ApplicationCard from './ApplicationCard';

export interface ApplicationItem {
  id: string;
  company: string;
  job_title: string;
  cover_letter_content: string | null;
  created_at: string;
}

export default function ApplicationList({ initialItems }: { initialItems: ApplicationItem[] }) {
  const [items, setItems] = useState<ApplicationItem[]>(initialItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} application${selected.size > 1 ? 's' : ''}?`)) return;
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
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary"
            checked={selected.size === items.length && items.length > 0}
            onChange={toggleSelectAll}
          />
          {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
        </label>
        {selected.size > 0 && (
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {deleting ? 'Deleting…' : `Delete ${selected.size}`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(app => (
          <ApplicationCard
            key={app.id}
            id={app.id}
            company={app.company}
            jobTitle={app.job_title}
            createdAt={app.created_at}
            hasCoverLetter={!!app.cover_letter_content}
            selected={selected.has(app.id)}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
