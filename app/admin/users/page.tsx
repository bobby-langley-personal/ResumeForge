'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAdminContext } from '../AdminContext';
import { UserDetailPanel } from '../components/UserDetailPanel';
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  do_not_email: boolean;
  resume_count: number;
  doc_count: number;
}

type SortKey = keyof UserRow;
type SortDir = 'asc' | 'desc';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function planBadge(status: string | null) {
  if (status === 'pro') return 'bg-amber-900/40 text-amber-400';
  if (status === 'canceled') return 'bg-red-900/30 text-red-400';
  return 'bg-zinc-800 text-zinc-500';
}

function sortVal(u: UserRow, key: SortKey): string | number {
  const v = u[key];
  if (v === null || v === undefined) return '';
  return v as string | number;
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function Th({
  label, sortKey, active, dir, onSort, className = '',
}: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const Icon = active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors whitespace-nowrap ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-zinc-300' : 'text-zinc-700'}`} />
      </span>
    </th>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { secret } = useAdminContext();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [segment, setSegment] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ segment, sortBy: sortKey as string, sortDir });
    fetch(`/api/admin/users?${params}`, { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [secret, segment, sortKey, sortDir]);

  // Only re-fetch when segment changes; sort/search are client-side
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [segment, secret]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let rows = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      const av = sortVal(a, sortKey);
      const bv = sortVal(b, sortKey);
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [users, search, sortKey, sortDir]);

  const SEGMENTS = [
    { value: 'all', label: 'All' },
    { value: 'pro', label: 'Pro' },
    { value: 'free', label: 'Free' },
    { value: 'new7d', label: 'New 7d' },
    { value: 'new30d', label: 'New 30d' },
    { value: 'canceled', label: 'Canceled' },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Users</h1>
          {!loading && (
            <p className="text-xs text-zinc-600 mt-0.5">
              {filtered.length !== total ? `${filtered.length} of ` : ''}{total} users
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Segment pills */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {SEGMENTS.map(s => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                segment === s.value
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 pl-8 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-600 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <Th label="Name" sortKey="full_name" active={sortKey === 'full_name'} dir={sortDir} onSort={toggleSort} className="pl-4" />
                <Th label="Plan" sortKey="subscription_status" active={sortKey === 'subscription_status'} dir={sortDir} onSort={toggleSort} />
                <Th label="Joined" sortKey="created_at" active={sortKey === 'created_at'} dir={sortDir} onSort={toggleSort} />
                <Th label="Last seen" sortKey="last_sign_in_at" active={sortKey === 'last_sign_in_at'} dir={sortDir} onSort={toggleSort} />
                <Th label="Résumés" sortKey="resume_count" active={sortKey === 'resume_count'} dir={sortDir} onSort={toggleSort} />
                <Th label="Docs" sortKey="doc_count" active={sortKey === 'doc_count'} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">No users found.</td>
                </tr>
              ) : filtered.map((u, i) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`${i < filtered.length - 1 ? 'border-b border-zinc-800/50' : ''} hover:bg-zinc-800/30 transition-colors cursor-pointer`}
                >
                  <td className="px-4 py-3">
                    <p className="text-zinc-200 text-sm">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-zinc-600 text-xs">{u.email}</p>}
                    {u.do_not_email && <p className="text-orange-500 text-[10px]">DNE</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${planBadge(u.subscription_status)}`}>
                      {u.subscription_status ?? 'free'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-400 text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                  <td className="px-3 py-3 text-zinc-400 text-xs whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
                  <td className="px-3 py-3 text-zinc-300 text-sm font-medium">{u.resume_count}</td>
                  <td className="px-3 py-3 text-zinc-300 text-sm font-medium">{u.doc_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </div>
          )}
        </div>
      )}

      {/* User detail modal */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setSelectedUserId(null); }}
        >
          <div className="w-full max-w-xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <UserDetailPanel
              userId={selectedUserId}
              secret={secret}
              onBack={() => setSelectedUserId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
