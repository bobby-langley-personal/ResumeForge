'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ResumeItem, ItemType, ITEM_TYPE_LABELS } from '@/types/resume';
import { Plus, Trash2, Star, Pencil, Upload, X, Check, FileText, Sparkles, Diamond } from 'lucide-react';
import TipsPanel from '@/components/TipsPanel';

interface Props {
  initialItems: ResumeItem[];
  baseResume: ResumeItem | null;
}

type ModalMode = 'add' | 'edit' | null;

export default function ResumeLibrary({ initialItems, baseResume }: Props) {
  const [items, setItems] = useState<ResumeItem[]>(initialItems);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingItem, setEditingItem] = useState<ResumeItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [itemType, setItemType] = useState<ItemType>('resume');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openAdd = () => {
    setTitle('');
    setText('');
    setItemType('resume');
    setIsDefault(false);
    setEditingItem(null);
    setError('');
    setModal('add');
  };

  const openEdit = (item: ResumeItem) => {
    setTitle(item.title);
    setText(item.content.text);
    setItemType(item.item_type);
    setIsDefault(item.is_default);
    setEditingItem(item);
    setError('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditingItem(null); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-resume', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setText(result.text);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !text.trim()) { setError('Name and content are required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { title: title.trim(), content: { text: text.trim() }, item_type: itemType, is_default: isDefault };

      if (modal === 'add') {
        const res = await fetch('/api/resumes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        const created: ResumeItem = await res.json();
        setItems(prev => {
          const updated = isDefault ? prev.map(i => ({ ...i, is_default: false })) : prev;
          return [created, ...updated];
        });
      } else if (modal === 'edit' && editingItem) {
        const res = await fetch(`/api/resumes/${editingItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        const updated: ResumeItem = await res.json();
        setItems(prev => prev.map(i => i.id === updated.id ? updated : (isDefault ? { ...i, is_default: false } : i)));
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (item: ResumeItem) => {
    const res = await fetch(`/api/resumes/${item.id}/default`, { method: 'PATCH' });
    if (!res.ok) return;
    setItems(prev => prev.map(i => ({ ...i, is_default: i.id === item.id })));
  };

  const handleDelete = async (item: ResumeItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const res = await fetch(`/api/resumes/${item.id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const formattedDate = baseResume
    ? new Date(baseResume.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="space-y-8">
      {/* Base Resume Section */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Base Resume
        </h3>
        {baseResume ? (
          <div className="border border-border rounded-xl p-5 bg-card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">{baseResume.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last updated {formattedDate} · {(baseResume.content?.text?.length ?? 0).toLocaleString()} chars
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/base-resume?id=${baseResume.id}`}>
                  <Button size="sm" variant="outline">Edit &amp; Refine</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl p-6 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium text-foreground">No base resume yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                A base resume is the master document all your tailored resumes are built from.
                It takes about 2 minutes to create.
              </p>
            </div>
            <Link href="/base-resume">
              <Button>Create Base Resume →</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Polished Resume CTA */}
      <div className="border border-primary/20 rounded-xl p-5 bg-primary/5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Diamond className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Polished General-Use Resume</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                A strong standalone resume optimized for recruiters, networking, and broad applications — not tailored to a specific job.
              </p>
            </div>
          </div>
          <Link href="/polished-resume" className="shrink-0">
            <Button size="sm" variant="outline">Create</Button>
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Context Documents</h3>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        <Button onClick={openAdd} title="Add a new resume or document to your library">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-muted-foreground">No saved items yet.</p>
          <Button onClick={openAdd}>Add your first resume</Button>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {ITEM_TYPE_LABELS[item.item_type]}
                </span>
                {item.is_default && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {item.content?.text?.slice(0, 120) ?? ''}…
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(item.content?.text?.length ?? 0).toLocaleString()} chars
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!item.is_default && (
                <Button size="sm" variant="ghost" onClick={() => handleSetDefault(item)} title="Set as default">
                  <Star className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => openEdit(item)} title="Edit">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(item)} title="Delete" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <TipsPanel onUpload={openAdd} />

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">{modal === 'add' ? 'Add New Item' : 'Edit Item'}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground" title="Close without saving">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. My 2025 Resume" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={itemType}
                    onChange={e => setItemType(e.target.value as ItemType)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(ITEM_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-1.5">
                <Label>Upload file (PDF or DOCX) — or paste below</Label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>{isUploading ? 'Extracting text…' : 'Click to upload file'}</span>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste resume text, cover letter example, portfolio notes…"
                  className="min-h-52 font-mono text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 accent-primary" />
                Set as default (auto-fills home page background)
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal} title="Discard changes and close">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} title="Save this document to My Documents">
                <Check className="w-4 h-4 mr-2" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div> {/* end Context Documents */}
    </div>
  );
}
