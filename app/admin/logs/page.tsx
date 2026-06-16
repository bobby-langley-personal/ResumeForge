'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminContext } from '../AdminContext';
import { Loader2, RefreshCw, ChevronDown, ChevronUp, AlertCircle, User } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string | null;
  route: string;
  method: string;
  status_code: number | null;
  request_body: Record<string, unknown> | null;
  response_summary: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number | null;
  app_version: string | null;
  created_at: string;
  user: { email: string; full_name: string | null } | null;
}

const ROUTES = [
  '', '/api/generate-documents', '/api/analyze-fit',
  '/api/billing/create-checkout', '/api/resume-chat',
];

function statusColor(code: number | null) {
  if (!code) return 'bg-zinc-800 text-zinc-400';
  if (code < 300) return 'bg-emerald-900/40 text-emerald-400';
  if (code < 400) return 'bg-blue-900/40 text-blue-400';
  if (code < 500) return 'bg-amber-900/40 text-amber-400';
  return 'bg-red-900/40 text-red-400';
}

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function ExpandedLog({ log }: { log: LogEntry }) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-3 text-xs font-mono">
      {log.user_id && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">User</p>
          <p className="text-zinc-300">{log.user?.full_name || log.user?.email || log.user_id}</p>
          {log.user?.full_name && <p className="text-zinc-500">{log.user.email}</p>}
          <p className="text-zinc-600 break-all">{log.user_id}</p>
        </div>
      )}
      {log.app_version && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">App version</p>
          <p className="text-zinc-400 font-mono">{log.app_version}</p>
        </div>
      )}
      {log.error && (
        <div>
          <p className="text-red-400 font-sans font-medium mb-1">Error</p>
          <pre className="text-red-300 whitespace-pre-wrap break-all bg-red-950/20 rounded p-2">{log.error}</pre>
        </div>
      )}
      {log.request_body && (
        <div>
          <p className="text-zinc-500 font-sans font-medium mb-1">Request body</p>
          <pre className="text-zinc-400 whitespace-pre-wrap break-all bg-zinc-900 rounded p-2 overflow-auto max-h-48">
            {JSON.stringify(log.request_body, null, 2)}
          </pre>
        </div>
      )}
      {log.response_summary && (
        <div>
          <p className="text-zinc-500 font-sans font-medium mb-1">Response summary</p>
          <pre className="text-zinc-400 whitespace-pre-wrap break-all bg-zinc-900 rounded p-2 overflow-auto max-h-48">
            {JSON.stringify(log.response_summary, null, 2)}
          </pre>
        </div>
      )}
      {!log.error && !log.request_body && !log.response_summary && (
        <p className="text-zinc-600 font-sans">No additional data stored for this call.</p>
      )}
    </div>
  );
}

export default function AdminLogsPage() {
  const { secret } = useAdminContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterRoute, setFilterRoute] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterError, setFilterError] = useState<'' | 'true' | 'false'>('');

  const load = useCallback((p: number) => {
    if (!secret) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (filterRoute) params.set('route', filterRoute);
    if (filterUserId) params.set('userId', filterUserId);
    if (filterError) params.set('hasError', filterError);
    fetch(`/api/admin/logs?${params}`, { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(data => { setLogs(data.logs ?? []); setTotal(data.total ?? 0); setPage(p); })
      .finally(() => setLoading(false));
  }, [secret, filterRoute, filterUserId, filterError]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">API Logs</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{total} total</span>
          <button
            onClick={() => load(page)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterRoute}
          onChange={e => setFilterRoute(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500"
        >
          <option value="">All routes</option>
          {ROUTES.filter(Boolean).map(r => (
            <option key={r} value={r}>{r.replace('/api/', '')}</option>
          ))}
        </select>

        <select
          value={filterError}
          onChange={e => setFilterError(e.target.value as '' | 'true' | 'false')}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500"
        >
          <option value="">All statuses</option>
          <option value="false">Success only</option>
          <option value="true">Errors only</option>
        </select>

        <input
          type="text"
          placeholder="Filter by user ID"
          value={filterUserId}
          onChange={e => setFilterUserId(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500 w-52"
        />

        {(filterRoute || filterUserId || filterError) && (
          <button
            onClick={() => { setFilterRoute(''); setFilterUserId(''); setFilterError(''); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-sm">No logs found.</div>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-[80px_1fr_160px_72px_80px_70px_24px] gap-2 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
              <span>Status</span>
              <span>Route</span>
              <span>User</span>
              <span>Version</span>
              <span>Duration</span>
              <span>Time</span>
              <span />
            </div>

            {logs.map(log => (
              <div key={log.id} className="border-b border-zinc-800/60 last:border-0">
                <button
                  onClick={() => setExpandedId(id => id === log.id ? null : log.id)}
                  className="w-full grid grid-cols-[80px_1fr_160px_72px_80px_70px_24px] gap-2 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors items-center"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono w-fit ${statusColor(log.status_code)}`}>
                    {log.status_code ?? '?'}
                  </span>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs text-zinc-300 font-mono truncate">
                      {log.route.replace('/api/', '')}
                    </span>
                    {log.error && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="min-w-0">
                    {log.user ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="w-3 h-3 text-zinc-600 shrink-0" />
                        <span className="text-xs text-zinc-400 truncate">
                          {log.user.full_name || log.user.email}
                        </span>
                      </div>
                    ) : log.user_id ? (
                      <span className="text-xs text-zinc-600 font-mono truncate block">{log.user_id.slice(0, 12)}…</span>
                    ) : (
                      <span className="text-xs text-zinc-700">anon</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 font-mono truncate">
                    {log.app_version ?? '—'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {timeStr(log.created_at)}
                  </span>
                  {expandedId === log.id
                    ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  }
                </button>
                {expandedId === log.id && <ExpandedLog log={log} />}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <button
            disabled={page === 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
          >
            ← Previous
          </button>
          <span>Page {page} of {totalPages} ({total} entries)</span>
          <button
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
