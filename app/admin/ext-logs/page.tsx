'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdminContext } from '../AdminContext';
import { Loader2, RefreshCw, ChevronDown, ChevronUp, Puzzle } from 'lucide-react';

interface ExtLogEntry {
  id: string;
  user_id: string | null;
  event: string;
  platform: string | null;
  method: string | null;
  severity: 'info' | 'warning' | 'error';
  payload: Record<string, unknown> | null;
  ext_version: string | null;
  created_at: string;
  user: { full_name: string | null; email: string | null } | null;
}

const SEVERITY_STYLE = {
  info:    'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50',
  warning: 'bg-amber-900/40 text-amber-400 border border-amber-800/50',
  error:   'bg-red-900/40 text-red-400 border border-red-800/50',
};

const PLATFORMS = ['', 'linkedin', 'greenhouse', 'lever', 'indeed', 'workday', 'glassdoor', 'ziprecruiter', 'other'];
const EVENTS    = ['', 'scrape_quality', 'fit_analysis_abandoned'];
const SEVERITIES: Array<'' | 'info' | 'warning' | 'error'> = ['', 'info', 'warning', 'error'];

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function QualityBar({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return null;
  const { hasTitle, hasCompany, hasDescription, descriptionLength } = payload;
  const items = [
    { label: 'title',   ok: !!hasTitle },
    { label: 'company', ok: !!hasCompany },
    { label: 'desc',    ok: !!hasDescription },
  ];
  return (
    <div className="flex items-center gap-2 mt-1">
      {items.map(({ label, ok }) => (
        <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
          {label}
        </span>
      ))}
      {typeof descriptionLength === 'number' && (
        <span className="text-[10px] text-zinc-600">{descriptionLength.toLocaleString()} chars</span>
      )}
    </div>
  );
}

function ExpandedLog({ log }: { log: ExtLogEntry }) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-3 text-xs font-mono">
      {log.user_id && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">User</p>
          <p className="text-zinc-300">{log.user?.full_name ?? log.user?.email ?? log.user_id}</p>
          {log.user?.full_name && <p className="text-zinc-500">{log.user.email}</p>}
          <p className="text-zinc-600 break-all">{log.user_id}</p>
        </div>
      )}
      {log.ext_version && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">Extension version</p>
          <p className="text-zinc-400">v{log.ext_version}</p>
        </div>
      )}
      {log.method && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">Scrape method</p>
          <p className="text-zinc-300">{log.method}</p>
        </div>
      )}
      {log.payload && Object.keys(log.payload).length > 0 && (
        <div>
          <p className="text-zinc-500 mb-1 font-sans font-medium">Payload</p>
          <pre className="text-zinc-400 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(log.payload, null, 2)}
          </pre>
        </div>
      )}
      <div>
        <p className="text-zinc-500 mb-1 font-sans font-medium">Timestamp</p>
        <p className="text-zinc-400">{new Date(log.created_at).toISOString()}</p>
      </div>
      <div>
        <p className="text-zinc-500 mb-1 font-sans font-medium">Log ID</p>
        <p className="text-zinc-600 break-all">{log.id}</p>
      </div>
    </div>
  );
}

export default function ExtLogsPage() {
  const { secret } = useAdminContext();
  const [logs, setLogs] = useState<ExtLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [days, setDays] = useState(30);
  const [filterSeverity, setFilterSeverity] = useState<'' | 'info' | 'warning' | 'error'>('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (filterSeverity) params.set('severity', filterSeverity);
    if (filterPlatform) params.set('platform', filterPlatform);
    if (filterEvent)    params.set('event', filterEvent);
    params.set('limit', '100');
    try {
      const res = await fetch(`/api/admin/ext-logs?${params}`, {
        headers: { 'x-admin-secret': secret },
        signal: controller.signal,
      });
      if (res.ok) {
        const { logs } = await res.json();
        setLogs(logs ?? []);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error(err);
    }
    setLoading(false);
  }, [secret, days, filterSeverity, filterPlatform, filterEvent]);

  useEffect(() => { load(); }, [load]);

  const errorCount   = logs.filter(l => l.severity === 'error').length;
  const warningCount = logs.filter(l => l.severity === 'warning').length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-zinc-500" />
          <h1 className="text-xl font-semibold text-zinc-100">Extension Logs</h1>
          {!loading && (
            <span className="text-xs text-zinc-500 ml-1">
              {logs.length} entries
              {errorCount > 0 && <span className="ml-2 text-red-400">{errorCount} errors</span>}
              {warningCount > 0 && <span className="ml-2 text-amber-400">{warningCount} warnings</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Severity</label>
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as typeof filterSeverity)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Platform</label>
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p || 'All'}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Event</label>
          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            {EVENTS.map(ev => <option key={ev} value={ev}>{ev || 'All'}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[100px_1fr_90px_100px_90px_80px_20px] gap-4 px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>Time</span>
          <span>User</span>
          <span>Event</span>
          <span>Platform</span>
          <span>Severity</span>
          <span>Ext ver</span>
          <span />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 text-sm">No extension logs yet.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="border-b border-zinc-800/60 last:border-0">
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full grid grid-cols-[100px_1fr_90px_100px_90px_80px_20px] gap-4 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
              >
                <span className="text-[11px] text-zinc-500 tabular-nums">{timeStr(log.created_at)}</span>

                <span className="min-w-0">
                  <p className="text-xs text-zinc-200 truncate">
                    {log.user?.full_name ?? log.user?.email ?? log.user_id ?? 'anonymous'}
                  </p>
                  {log.event === 'scrape_quality' && (
                    <QualityBar payload={log.payload} />
                  )}
                </span>

                <span className="text-[11px] text-zinc-400 truncate">{log.event}</span>
                <span className="text-[11px] text-zinc-400">{log.platform ?? '—'}</span>

                <span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SEVERITY_STYLE[log.severity]}`}>
                    {log.severity}
                  </span>
                </span>

                <span className="text-[11px] text-zinc-600">{log.ext_version ? `v${log.ext_version}` : '—'}</span>

                <span className="text-zinc-600 flex items-center">
                  {expandedId === log.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {expandedId === log.id && <ExpandedLog log={log} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
