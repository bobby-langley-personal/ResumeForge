'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { NotificationType } from '@/lib/notifications';

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  setup_experience: 'Set up experience (no docs)',
  first_tailor: 'First tailor nudge (has docs, no resumes)',
  add_more_experience: 'Add more experience (1 doc, has resumes)',
  job_hunt_checkin: 'Job hunt check-in (inactive 14d)',
  try_extension: 'Try the extension (not used yet)',
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

export default function NotificationsAdminPage() {
  const { user, isLoaded } = useUser();
  const [adminSecret, setAdminSecret] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notificationType, setNotificationType] = useState<NotificationType>('setup_experience');
  const [force, setForce] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [error, setError] = useState('');

  // Guard: only Bobby's user ID
  if (isLoaded && (!user || (ADMIN_USER_ID && user.id !== ADMIN_USER_ID))) {
    return <div className="p-8 text-red-500">Access denied.</div>;
  }

  const fetchUsers = async () => {
    if (!adminSecret) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/send-notification', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (!res.ok) { setError('Wrong secret or server error'); setLoading(false); return; }
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to fetch users');
    }
    setLoading(false);
  };

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

  const send = async () => {
    if (!selectedIds.size) return;
    setSending(true);
    setResults(null);
    const res = await fetch('/api/admin/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
      body: JSON.stringify({ userIds: Array.from(selectedIds), notificationType, force }),
    });
    const data = await res.json();
    setResults(data.results);
    setSending(false);
    // Refresh user list to reflect newly sent notifications
    fetchUsers();
  };

  const daysSince = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8">
      <h1 className="text-xl font-semibold mb-6">Notification Admin</h1>

      {/* Secret input */}
      <div className="flex gap-3 mb-8">
        <input
          type="password"
          placeholder="Admin secret"
          value={adminSecret}
          onChange={e => setAdminSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers()}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load Users'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {users.length > 0 && (
        <>
          {/* Send controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <select
              value={notificationType}
              onChange={e => setNotificationType(e.target.value as NotificationType)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none"
            >
              {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map(t => (
                <option key={t} value={t}>{NOTIFICATION_LABELS[t]}</option>
              ))}
            </select>
            <button onClick={selectEligible} className="text-xs text-blue-400 hover:text-blue-300">
              Select eligible for this type ({users.filter(u => u.eligible.includes(notificationType)).length})
            </button>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="accent-blue-500" />
              Force re-send (bypass already-sent check)
            </label>
            <button
              onClick={send}
              disabled={sending || selectedIds.size === 0}
              className="ml-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded font-medium"
            >
              {sending ? 'Sending…' : `Send to ${selectedIds.size} user${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm space-y-1">
              <p className="font-medium text-zinc-300 mb-2">Send results:</p>
              {results.map(r => (
                <div key={r.userId} className={`flex gap-3 ${r.ok ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{r.ok ? '✓' : '✗'}</span>
                  <span>{r.email}</span>
                  {!r.ok && <span className="text-zinc-500">{r.error}</span>}
                </div>
              ))}
            </div>
          )}

          {/* User table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">
                    <input type="checkbox" checked={selectedIds.size === users.length} onChange={toggleAll} className="accent-blue-500" />
                  </th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2 pr-4">Docs</th>
                  <th className="pb-2 pr-4">Resumes</th>
                  <th className="pb-2 pr-4">Last active</th>
                  <th className="pb-2 pr-4">Ext</th>
                  <th className="pb-2 pr-4">Sent</th>
                  <th className="pb-2">Eligible</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="accent-blue-500"
                      />
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">{u.email}</td>
                    <td className="py-2 pr-4 text-zinc-500">{daysSince(u.created_at)}</td>
                    <td className="py-2 pr-4">{u.doc_count}</td>
                    <td className="py-2 pr-4">{u.tailor_count}</td>
                    <td className="py-2 pr-4 text-zinc-500">{u.last_tailor_at ? daysSince(u.last_tailor_at) : '—'}</td>
                    <td className="py-2 pr-4">{u.has_used_extension ? '✓' : '—'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {u.sent_notifications.map(t => (
                          <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.eligible.map(t => (
                          <span key={t} className="text-[10px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
