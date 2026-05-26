'use client';

import { useEffect, useState } from 'react';
import { useAdminContext } from '../AdminContext';
import type { NotificationType } from '@/lib/notifications';
import { Loader2, ChevronDown, ChevronUp, Send, Eye, X } from 'lucide-react';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  setup_experience: 'Set up experience — no docs uploaded',
  first_tailor: 'First tailor nudge — has docs, no resumes',
  add_more_experience: 'Add more experience — 1 doc, has resumes',
  job_hunt_checkin: 'Job hunt check-in — inactive 14+ days',
  try_extension: 'Try the extension — not used yet',
};

const NOTIFICATION_DESCRIPTIONS: Record<NotificationType, string> = {
  setup_experience: 'Sent 24h after signup to users with 0 docs.',
  first_tailor: 'Sent 48h after signup to users with docs but no tailored resumes.',
  add_more_experience: 'Sent 7d after signup to users with 1 doc and at least 1 resume.',
  job_hunt_checkin: 'Sent to users inactive for 14+ days who have tailored at least once.',
  try_extension: 'Sent 3d after signup to users who haven\'t used the Chrome extension.',
};

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  doc_count: number;
  tailor_count: number;
  last_tailor_at: string | null;
  has_used_extension: boolean;
  sent_notifications: NotificationType[];
  eligible: NotificationType[];
}

interface SendResult {
  userId: string;
  email: string;
  ok: boolean;
  error?: string;
}

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
}

function PreviewModal({ type, secret, onClose }: { type: NotificationType; secret: string; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/preview-notification?type=${type}`, { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(d => { setHtml(d.html); setSubject(d.subject); })
      .catch(() => setHtml('<p style="color:red">Failed to load preview</p>'));
  }, [type, secret]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Email preview</p>
            {subject && <p className="text-sm text-zinc-200 font-medium mt-0.5">{subject}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {html ? (
            <iframe
              srcDoc={html}
              className="w-full rounded border border-zinc-800 bg-white"
              style={{ height: '500px' }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-600">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading preview…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsAdminPage() {
  const { secret } = useAdminContext();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notificationType, setNotificationType] = useState<NotificationType>('setup_experience');
  const [force, setForce] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (secret) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/send-notification', {
        headers: { 'x-admin-secret': secret },
      });
      if (!res.ok) { setError('Wrong secret or server error'); setLoading(false); return; }
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to fetch users');
    }
    setLoading(false);
  }

  const toggleAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map(u => u.id)));
  };

  const toggleUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectEligible = () => {
    setSelectedIds(new Set(users.filter(u => u.eligible.includes(notificationType)).map(u => u.id)));
  };

  async function send() {
    if (!selectedIds.size) return;
    setSending(true);
    setResults(null);
    const res = await fetch('/api/admin/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ userIds: Array.from(selectedIds), notificationType, force }),
    });
    const data = await res.json();
    setResults(data.results);
    setSending(false);
    fetchUsers();
  }

  const eligibleCount = users.filter(u => u.eligible.includes(notificationType)).length;
  const successCount = results?.filter(r => r.ok).length ?? 0;
  const failCount = results?.filter(r => !r.ok).length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {showPreview && <PreviewModal type={notificationType} secret={secret} onClose={() => setShowPreview(false)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Notifications</h1>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Refresh
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Notification type selector + actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Notification type</label>
            <select
              value={notificationType}
              onChange={e => { setNotificationType(e.target.value as NotificationType); setResults(null); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 text-zinc-200"
            >
              {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map(t => (
                <option key={t} value={t}>{NOTIFICATION_LABELS[t]}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-600 mt-1.5">{NOTIFICATION_DESCRIPTIONS[notificationType]}</p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 pt-5">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview email
            </button>
            <button
              onClick={selectEligible}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left"
            >
              Select {eligibleCount} eligible
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="accent-blue-500" />
            Force re-send
          </label>
          <button
            onClick={send}
            disabled={sending || selectedIds.size === 0}
            className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded font-medium transition-colors"
          >
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
              : <><Send className="w-4 h-4" />Send to {selectedIds.size} user{selectedIds.size !== 1 ? 's' : ''}</>
            }
          </button>
        </div>
      </div>

      {/* Send results */}
      {results && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm font-medium text-zinc-300">Send results</p>
            {successCount > 0 && <span className="text-xs text-green-400">{successCount} sent</span>}
            {failCount > 0 && <span className="text-xs text-red-400">{failCount} failed</span>}
          </div>
          {results.map(r => (
            <div key={r.userId} className={`flex gap-3 text-sm ${r.ok ? 'text-green-400' : 'text-red-400'}`}>
              <span>{r.ok ? '✓' : '✗'}</span>
              <span>{r.email}</span>
              {!r.ok && <span className="text-zinc-500 text-xs">{r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* User table */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
        </div>
      ) : users.length > 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-left bg-zinc-900/80">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === users.length && users.length > 0}
                    onChange={toggleAll}
                    className="accent-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">User</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Joined</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Activity</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Sent</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const isExpanded = expandedUserId === u.id;
                const isEligibleForCurrent = u.eligible.includes(notificationType);
                return (
                  <>
                    <tr
                      key={u.id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors ${selectedIds.has(u.id) ? 'bg-blue-950/20' : ''}`}
                      onClick={() => toggleUser(u.id)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-200">{u.email}</p>
                        {u.full_name && <p className="text-zinc-600 text-xs">{u.full_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{daysSince(u.created_at)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <span>{u.doc_count} doc{u.doc_count !== 1 ? 's' : ''}</span>
                        <span className="mx-1 text-zinc-700">·</span>
                        <span>{u.tailor_count} resume{u.tailor_count !== 1 ? 's' : ''}</span>
                        {u.has_used_extension && <span className="ml-1 text-blue-500">· ext</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.sent_notifications.map(t => (
                            <span key={t} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t.replace(/_/g, ' ')}</span>
                          ))}
                          {u.sent_notifications.length === 0 && <span className="text-zinc-700 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.eligible.map(t => (
                            <span
                              key={t}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${t === notificationType ? 'bg-blue-900/50 text-blue-400 ring-1 ring-blue-700' : 'bg-zinc-800/50 text-zinc-500'}`}
                            >
                              {t.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {u.eligible.length === 0 && <span className="text-zinc-700 text-xs">none</span>}
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
            {users.length} users · {selectedIds.size} selected · {eligibleCount} eligible for current type
          </div>
        </div>
      ) : (
        <p className="text-zinc-600 text-sm">No users loaded.</p>
      )}
    </div>
  );
}
