'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminContext } from './AdminContext';
import { UserDetailPanel, planBadge, timeAgo } from './components/UserDetailPanel';
import {
  Users, TrendingUp, Crown, Mail, CheckCircle, XCircle, Loader2, Send,
  ChevronRight, X, Activity, BellOff,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  subscriptions: { free: number; pro: number; canceled: number };
  recentSignups: UserRow[];
  resendConfigured: boolean;
  lastNotificationSentAt: string | null;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription_status: string | null;
  resume_count?: number;
  do_not_email?: boolean;
}

type PanelSegment = 'all' | 'new7d' | 'new30d' | 'pro' | 'free' | 'canceled';

const SEGMENT_LABELS: Record<PanelSegment, string> = {
  all: 'All users',
  new7d: 'New this week',
  new30d: 'New this month',
  pro: 'Pro subscribers',
  free: 'Free users',
  canceled: 'Canceled',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color = 'text-zinc-400', onClick,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-left w-full transition-colors ${
        onClick ? 'hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      {onClick && (
        <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1">
          View users <ChevronRight className="w-3 h-3" />
        </p>
      )}
    </button>
  );
}

// ── Users list panel ──────────────────────────────────────────────────────────

function UsersListPanel({
  segment, secret, onSelectUser,
}: { segment: PanelSegment; secret: string; onSelectUser: (id: string) => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/users?segment=${segment}&page=${p}`, { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(data => { setUsers(data.users ?? []); setTotal(data.total ?? 0); setPage(p); })
      .finally(() => setLoading(false));
  }, [segment, secret]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-sm font-medium text-zinc-300">{SEGMENT_LABELS[segment]}</p>
        <p className="text-xs text-zinc-600">{total} users</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-zinc-600 text-sm p-4">No users found.</p>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {users.map((u, i) => (
              <button
                key={u.id}
                onClick={() => onSelectUser(u.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors ${
                  i < users.length - 1 ? 'border-b border-zinc-800/50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{u.full_name || u.email}</p>
                  {u.full_name && <p className="text-xs text-zinc-600 truncate">{u.email}</p>}
                  <p className="text-xs text-zinc-600">{timeAgo(u.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${planBadge(u.subscription_status)}`}>
                    {u.subscription_status ?? 'free'}
                  </span>
                  {u.do_not_email && (
                    <span className="flex items-center gap-0.5 text-[10px] text-orange-500">
                      <BellOff className="w-3 h-3" /> DNE
                    </span>
                  )}
                  {u.resume_count != null && (
                    <span className="text-xs text-zinc-600">{u.resume_count} résumés</span>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 shrink-0 text-xs">
              <button
                disabled={page === 1}
                onClick={() => load(page - 1)}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-zinc-600">Page {page} of {Math.ceil(total / 50)}</span>
              <button
                disabled={page * 50 >= total}
                onClick={() => load(page + 1)}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { secret } = useAdminContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Panel state
  const [panelSegment, setPanelSegment] = useState<PanelSegment | null>(null);
  const [panelUserId, setPanelUserId] = useState<string | null>(null);

  const openSegment = (seg: PanelSegment) => {
    setPanelUserId(null);
    setPanelSegment(seg);
  };
  const closePanel = () => { setPanelSegment(null); setPanelUserId(null); };

  useEffect(() => {
    if (!secret) return;
    fetch('/api/admin/stats', { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [secret]);

  async function sendTestEmail() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      setTestResult(data.ok
        ? { ok: true, message: `Sent to ${data.sentTo}` }
        : { ok: false, message: data.error ?? 'Failed' }
      );
    } catch {
      setTestResult({ ok: false, message: 'Network error' });
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!stats) return <p className="text-red-400 text-sm">Failed to load stats.</p>;

  return (
    <div className="flex gap-6 min-h-0">
      {/* Main content */}
      <div className={`space-y-8 transition-all duration-200 ${panelSegment ? 'max-w-xl' : 'max-w-4xl'} flex-1 min-w-0`}>
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total users" value={stats.totalUsers}
            icon={Users} color="text-blue-400"
            onClick={() => openSegment('all')}
          />
          <StatCard
            label="New (7d)" value={stats.newUsers7d}
            sub={`${stats.newUsers30d} in last 30d`}
            icon={TrendingUp} color="text-green-400"
            onClick={() => openSegment('new7d')}
          />
          <StatCard
            label="Pro subscribers" value={stats.subscriptions.pro}
            sub={`${stats.subscriptions.canceled} canceled`}
            icon={Crown} color="text-amber-400"
            onClick={() => openSegment('pro')}
          />
          <StatCard
            label="Free users" value={stats.subscriptions.free}
            sub={`${Math.round((stats.subscriptions.free / Math.max(stats.totalUsers, 1)) * 100)}% of total`}
            icon={Users}
            onClick={() => openSegment('free')}
          />
        </div>

        {/* Email health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-500" />
              Email health
            </h2>
            <button
              onClick={sendTestEmail}
              disabled={testSending || !stats.resendConfigured}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
            >
              {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send test email
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {stats.resendConfigured
                ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span className={stats.resendConfigured ? 'text-zinc-300' : 'text-red-400'}>
                Resend API key {stats.resendConfigured ? 'configured' : 'not configured — emails will not send'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs pl-6">
              Last notification sent: {stats.lastNotificationSentAt ? timeAgo(stats.lastNotificationSentAt) : 'never'}
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 mt-2 pl-6 text-xs ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Recent signups */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent signups</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-2.5 text-xs text-zinc-500 font-medium">User</th>
                  <th className="px-4 py-2.5 text-xs text-zinc-500 font-medium">Plan</th>
                  <th className="px-4 py-2.5 text-xs text-zinc-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => { setPanelSegment('all'); setPanelUserId(u.id); }}
                    className={`${i < stats.recentSignups.length - 1 ? 'border-b border-zinc-800/50' : ''} hover:bg-zinc-800/30 transition-colors cursor-pointer`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-zinc-200">{u.full_name || u.email}</p>
                      {u.full_name && <p className="text-zinc-600 text-xs">{u.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${planBadge(u.subscription_status)}`}>
                        {u.subscription_status ?? 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      <span className="flex items-center gap-1">
                        {timeAgo(u.created_at)} <Activity className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recentSignups.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-zinc-600 text-sm">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {panelSegment && (
        <div className="w-96 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col overflow-hidden self-start sticky top-0 max-h-[calc(100vh-4rem)]">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Users</p>
            <button onClick={closePanel} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {panelUserId ? (
            <UserDetailPanel
              userId={panelUserId}
              secret={secret}
              onBack={() => setPanelUserId(null)}
            />
          ) : (
            <UsersListPanel
              segment={panelSegment}
              secret={secret}
              onSelectUser={id => setPanelUserId(id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
