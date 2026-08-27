'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdminContext } from '../AdminContext';
import { Loader2, RefreshCw, AlertTriangle, User } from 'lucide-react';

interface EventEntry {
  id: string;
  user_id: string | null;
  event: string;
  properties: Record<string, unknown> | null;
  created_at: string;
  user: { email: string; full_name: string | null } | null;
}

interface Aggregate {
  event: string;
  count: number;
  isFrustration: boolean;
}

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function eventBadgeClass(event: string, isFrustration: boolean) {
  if (isFrustration) return 'bg-red-900/30 text-red-400';
  if (event.includes('used') || event.includes('completed')) return 'bg-emerald-900/30 text-emerald-400';
  if (event.includes('upgrade') || event.includes('pricing')) return 'bg-amber-900/30 text-amber-400';
  return 'bg-zinc-800 text-zinc-400';
}

const FRUSTRATION_EVENTS = new Set([
  'chat_locked_clicked',
  'interview_prep_locked_clicked',
  'experience_interview_locked_clicked',
  'weekly_resume_cap_hit',
  'chat_limit_reached',
  'interview_prep_limit_reached',
  'experience_interview_limit_reached',
]);

export default function AdminEventsPage() {
  const { secret } = useAdminContext();
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterEvent, setFilterEvent] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((p: number) => {
    if (!secret) return;
    // Cancel any in-flight request to prevent stale results overwriting current ones
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), days: String(days) });
    if (filterEvent) params.set('event', filterEvent);
    if (filterSearch) params.set('q', filterSearch);
    fetch(`/api/admin/events?${params}`, { headers: { 'x-admin-secret': secret }, signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setEvents(data.events ?? []);
        setAggregates(data.aggregates ?? []);
        setTotal(data.total ?? 0);
        setPage(p);
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => setLoading(false));
  }, [secret, filterEvent, filterSearch, days]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));
  const frustrationAggs = aggregates.filter(a => a.isFrustration);
  const otherAggs = aggregates.filter(a => !a.isFrustration);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">User Events</h1>
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
          <span className="text-xs text-zinc-500">{total} events</span>
          <button
            onClick={() => load(page)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aggregates */}
      <div className="grid grid-cols-2 gap-4">
        {/* Frustration signals */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Frustration signals</p>
          </div>
          {frustrationAggs.length === 0 ? (
            <p className="text-xs text-zinc-600">None in this window.</p>
          ) : (
            <div className="space-y-1.5">
              {frustrationAggs.map(a => (
                <button
                  key={a.event}
                  onClick={() => setFilterEvent(filterEvent === a.event ? '' : a.event)}
                  className={`w-full flex items-center justify-between text-xs rounded px-2 py-1.5 transition-colors ${
                    filterEvent === a.event ? 'bg-red-900/40 text-red-300' : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="font-mono truncate">{a.event}</span>
                  <span className="font-semibold text-red-400 shrink-0 ml-2">{a.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* All other events */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">All events</p>
          {otherAggs.length === 0 ? (
            <p className="text-xs text-zinc-600">None in this window.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {otherAggs.map(a => (
                <button
                  key={a.event}
                  onClick={() => setFilterEvent(filterEvent === a.event ? '' : a.event)}
                  className={`w-full flex items-center justify-between text-xs rounded px-2 py-1.5 transition-colors ${
                    filterEvent === a.event ? 'bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="font-mono truncate">{a.event}</span>
                  <span className="font-semibold text-zinc-300 shrink-0 ml-2">{a.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by event name"
          value={filterEvent}
          onChange={e => setFilterEvent(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500 w-52 font-mono"
        />
        <input
          type="text"
          placeholder="Search name, email, event…"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500 w-52"
        />
        {(filterEvent || filterSearch) && (
          <button
            onClick={() => { setFilterEvent(''); setFilterSearch(''); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Event feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-sm">No events found.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_160px_140px] gap-2 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
              <span>Event</span>
              <span>User</span>
              <span>Time</span>
            </div>

            {events.map(ev => {
              const isFrustration = FRUSTRATION_EVENTS.has(ev.event);
              return (
                <div key={ev.id} className="border-b border-zinc-800/60 last:border-0">
                  <button
                    onClick={() => setExpandedId(id => id === ev.id ? null : ev.id)}
                    className="w-full grid grid-cols-[1fr_160px_140px] gap-2 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors items-center"
                  >
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono w-fit ${eventBadgeClass(ev.event, isFrustration)}`}>
                      {ev.event}
                    </span>
                    <div className="min-w-0">
                      {ev.user ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <User className="w-3 h-3 text-zinc-600 shrink-0" />
                          <span className="text-xs text-zinc-400 truncate">
                            {ev.user.full_name || ev.user.email}
                          </span>
                        </div>
                      ) : ev.user_id ? (
                        <span className="text-xs text-zinc-600 font-mono truncate block">{ev.user_id.slice(0, 12)}…</span>
                      ) : (
                        <span className="text-xs text-zinc-700">anon</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-600">{timeStr(ev.created_at)}</span>
                  </button>

                  {expandedId === ev.id && ev.properties && (
                    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
                      <p className="text-xs text-zinc-500 font-medium mb-1">Properties</p>
                      <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all bg-zinc-900 rounded p-2 overflow-auto max-h-40">
                        {JSON.stringify(ev.properties, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
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
