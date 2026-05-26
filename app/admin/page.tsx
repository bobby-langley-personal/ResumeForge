'use client';

import { useEffect, useState } from 'react';
import { useAdminContext } from './AdminContext';
import { Users, TrendingUp, Crown, Mail, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  subscriptions: { free: number; pro: number; canceled: number };
  recentSignups: { id: string; email: string; full_name: string | null; created_at: string; subscription_status: string }[];
  resendConfigured: boolean;
  lastNotificationSentAt: string | null;
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-zinc-400' }: {
  label: string; value: number | string; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return h === 0 ? 'just now' : `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminOverviewPage() {
  const { secret } = useAdminContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

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
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} color="text-blue-400" />
        <StatCard label="New (7d)" value={stats.newUsers7d} sub={`${stats.newUsers30d} in last 30d`} icon={TrendingUp} color="text-green-400" />
        <StatCard label="Pro subscribers" value={stats.subscriptions.pro} sub={`${stats.subscriptions.canceled} canceled`} icon={Crown} color="text-amber-400" />
        <StatCard
          label="Free users"
          value={stats.subscriptions.free}
          sub={`${Math.round((stats.subscriptions.free / Math.max(stats.totalUsers, 1)) * 100)}% of total`}
          icon={Users}
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
              : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            }
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
                <tr key={u.id} className={`${i < stats.recentSignups.length - 1 ? 'border-b border-zinc-800/50' : ''} hover:bg-zinc-800/30 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="text-zinc-200">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-zinc-600 text-xs">{u.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      u.subscription_status === 'pro'
                        ? 'bg-amber-900/40 text-amber-400'
                        : u.subscription_status === 'canceled'
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {u.subscription_status ?? 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{timeAgo(u.created_at)}</td>
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
  );
}
