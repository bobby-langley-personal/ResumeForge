'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, ExternalLink, FileText, Briefcase, Activity,
  ChevronDown, ChevronUp, Loader2, BellOff, MapPin, Linkedin,
} from 'lucide-react';

const AdminPDFRenderer = dynamic(() => import('@/components/AdminPDFRenderer'), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResumeDoc {
  id: string;
  title: string;
  item_type: string;
  is_default: boolean;
  created_at: string;
}

interface AppItem {
  id: string;
  company: string;
  job_title: string;
  created_at: string;
}

interface AppContent {
  resume_content: string | null;
  cover_letter_content: string | null;
  candidateName: string | null;
}

interface DocContent {
  text: string;
  fileName?: string;
}

interface LogEntry {
  id: string;
  route: string;
  method: string;
  status_code: number | null;
  request_body: Record<string, unknown> | null;
  response_summary: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number | null;
  app_version: string | null;
  created_at: string;
}

export interface UserDetail {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    subscription_status: string | null;
    subscription_period_end: string | null;
    created_at: string;
    tailored_resume_count: number;
    stripe_customer_id: string | null;
    do_not_email: boolean;
  };
  profile: {
    full_name: string | null;
    email: string | null;
    location: string | null;
    linkedin_url: string | null;
  } | null;
  resumes: ResumeDoc[];
  applications: { total: number; recent: AppItem[] };
  logs: LogEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function planBadge(status: string | null) {
  if (status === 'pro') return 'bg-amber-900/40 text-amber-400';
  if (status === 'canceled') return 'bg-red-900/30 text-red-400';
  return 'bg-zinc-800 text-zinc-500';
}

function statusBadge(code: number | null) {
  if (!code) return 'bg-zinc-800 text-zinc-400';
  if (code < 300) return 'bg-emerald-900/40 text-emerald-400';
  if (code < 400) return 'bg-blue-900/40 text-blue-400';
  if (code < 500) return 'bg-amber-900/40 text-amber-400';
  return 'bg-red-900/40 text-red-400';
}

// ── Sub-components ────────────────────────────────────────────────────────────

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">{children}</div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500 shrink-0 w-28">{label}</span>
      <span className="text-zinc-300 text-right break-all">{value}</span>
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const routeShort = log.route.replace('/api/', '');
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/40 transition-colors text-left"
      >
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${statusBadge(log.status_code)}`}>
          {log.status_code ?? '?'}
        </span>
        <span className="text-zinc-300 font-mono flex-1 truncate">{routeShort}</span>
        {log.app_version && (
          <span className="text-zinc-700 font-mono shrink-0 text-[10px]">{log.app_version}</span>
        )}
        {log.duration_ms != null && (
          <span className="text-zinc-600 shrink-0">{log.duration_ms}ms</span>
        )}
        <span className="text-zinc-600 shrink-0">{timeAgo(log.created_at)}</span>
      </button>
      {expanded && (
        <div className="border-t border-zinc-800 px-3 py-2 space-y-2">
          {log.error && (
            <div>
              <p className="text-red-400 font-medium mb-0.5">Error</p>
              <pre className="text-red-300 text-[10px] whitespace-pre-wrap break-all">{log.error}</pre>
            </div>
          )}
          {log.request_body && (
            <div>
              <p className="text-zinc-500 font-medium mb-0.5">Request</p>
              <pre className="text-zinc-400 text-[10px] whitespace-pre-wrap break-all">
                {JSON.stringify(log.request_body, null, 2)}
              </pre>
            </div>
          )}
          {log.response_summary && (
            <div>
              <p className="text-zinc-500 font-medium mb-0.5">Response summary</p>
              <pre className="text-zinc-400 text-[10px] whitespace-pre-wrap break-all">
                {JSON.stringify(log.response_summary, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── App Content Viewer (generated résumés) ───────────────────────────────────

function AppContentViewer({ content, company, jobTitle }: { content: AppContent; company: string; jobTitle: string }) {
  const hasResume = !!content.resume_content;
  const hasCoverLetter = !!content.cover_letter_content;
  const [tab, setTab] = useState<'resume' | 'cover_letter'>(hasResume ? 'resume' : 'cover_letter');
  const [showPDF, setShowPDF] = useState(false);
  const activeText = tab === 'resume' ? content.resume_content : content.cover_letter_content;
  const candidateName = content.candidateName ?? '';

  return (
    <div className="mt-1 mb-2 bg-zinc-950 border border-zinc-800 rounded text-xs overflow-hidden">
      <div className="flex items-center border-b border-zinc-800">
        <button
          onClick={() => setTab('resume')}
          disabled={!hasResume}
          className={`px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors disabled:opacity-30 ${
            tab === 'resume' ? 'border-zinc-400 text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Resume
        </button>
        <button
          onClick={() => setTab('cover_letter')}
          disabled={!hasCoverLetter}
          className={`px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors disabled:opacity-30 ${
            tab === 'cover_letter' ? 'border-zinc-400 text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Cover Letter{!hasCoverLetter ? ' (none)' : ''}
        </button>
        <div className="flex-1" />
        {activeText && (
          <button
            onClick={() => setShowPDF(v => !v)}
            className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
              showPDF ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {showPDF ? 'Raw text' : 'Preview PDF'}
          </button>
        )}
      </div>
      {showPDF && activeText ? (
        <AdminPDFRenderer
          type={tab}
          content={activeText}
          candidateName={candidateName}
          company={company}
          jobTitle={jobTitle}
        />
      ) : (
        <pre className="p-3 text-[10px] text-zinc-400 font-mono whitespace-pre-wrap break-words overflow-auto max-h-72 leading-relaxed">
          {activeText ?? <span className="text-zinc-600">No content</span>}
        </pre>
      )}
    </div>
  );
}

// ── Doc Content Viewer (experience library) ───────────────────────────────────

function DocContentViewer({ content }: { content: DocContent }) {
  return (
    <div className="mt-1 mb-2 bg-zinc-950 border border-zinc-800 rounded text-xs overflow-hidden">
      {content.fileName && (
        <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-500 font-mono truncate">
          {content.fileName}
        </div>
      )}
      <pre className="p-3 text-[10px] text-zinc-400 font-mono whitespace-pre-wrap break-words overflow-auto max-h-72 leading-relaxed">
        {content.text || <span className="text-zinc-600">No content</span>}
      </pre>
    </div>
  );
}

// ── User Detail Panel ─────────────────────────────────────────────────────────

export function UserDetailPanel({
  userId, secret, onBack,
}: { userId: string; secret: string; onBack: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'resumes' | 'logs'>('overview');
  const [dneToggling, setDneToggling] = useState(false);

  // Résumé (generated) content
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [appContentMap, setAppContentMap] = useState<Record<string, AppContent>>({});
  const [loadingAppId, setLoadingAppId] = useState<string | null>(null);

  // Doc (experience library) content
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [docContentMap, setDocContentMap] = useState<Record<string, DocContent | null>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  async function loadAppContent(appId: string) {
    if (appContentMap[appId]) {
      setExpandedAppId(id => id === appId ? null : appId);
      return;
    }
    setLoadingAppId(appId);
    setExpandedAppId(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, { headers: { 'x-admin-secret': secret } });
      const data = await res.json();
      setAppContentMap(m => ({
        ...m,
        [appId]: {
          resume_content: data.resume_content ?? null,
          cover_letter_content: data.cover_letter_content ?? null,
          candidateName: data.candidateName ?? null,
        },
      }));
    } finally {
      setLoadingAppId(null);
    }
  }

  async function loadDocContent(docId: string) {
    // Toggle closed if already expanded
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      return;
    }
    setExpandedDocId(docId);
    if (docContentMap[docId] !== undefined) return; // already fetched

    setLoadingDocId(docId);
    try {
      const res = await fetch(`/api/admin/resumes/${docId}`, { headers: { 'x-admin-secret': secret } });
      if (!res.ok) {
        setDocContentMap(m => ({ ...m, [docId]: null }));
        return;
      }
      const data = await res.json();
      const content = data.content as DocContent | null;
      setDocContentMap(m => ({ ...m, [docId]: content ?? null }));
    } finally {
      setLoadingDocId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users/${userId}`, { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [userId, secret]);

  async function toggleDoNotEmail() {
    if (!detail) return;
    const next = !detail.user.do_not_email;
    setDneToggling(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ do_not_email: next }),
    });
    setDetail(d => d ? { ...d, user: { ...d.user, do_not_email: next } } : d);
    setDneToggling(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    );
  }
  if (!detail) return <p className="text-red-400 text-sm p-4">Failed to load user.</p>;

  const { user, profile, resumes, applications, logs } = detail;

  const TABS = [
    { id: 'overview', label: 'Account' },
    { id: 'docs', label: `Docs (${resumes.length})` },
    { id: 'resumes', label: `Résumés (${applications.total})` },
    { id: 'logs', label: `API Logs (${logs.length})` },
  ] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 shrink-0">
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">
            {user.full_name || user.email}
          </p>
          {user.full_name && (
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          )}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${planBadge(user.subscription_status)}`}>
          {user.subscription_status ?? 'free'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-zinc-400 text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            <Section title="Account info">
              <Row label="User ID" value={<code className="text-xs text-zinc-400 font-mono break-all">{user.id}</code>} />
              <Row label="Email" value={user.email} />
              <Row label="Name" value={user.full_name ?? '—'} />
              <Row label="Joined" value={new Date(user.created_at).toLocaleString()} />
              <Row label="Plan" value={user.subscription_status ?? 'free'} />
              <Row label="Resumes generated" value={String(user.tailored_resume_count)} />
              {user.stripe_customer_id && (
                <Row
                  label="Stripe customer"
                  value={
                    <a
                      href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      {user.stripe_customer_id} <ExternalLink className="w-3 h-3" />
                    </a>
                  }
                />
              )}
              {user.subscription_period_end && (
                <Row label="Period ends" value={new Date(user.subscription_period_end).toLocaleDateString()} />
              )}
            </Section>

            {/* Do Not Email toggle */}
            <div className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
              user.do_not_email
                ? 'border-orange-700/50 bg-orange-950/20'
                : 'border-zinc-800 bg-zinc-900'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <BellOff className={`w-4 h-4 shrink-0 ${user.do_not_email ? 'text-orange-400' : 'text-zinc-600'}`} />
                <div>
                  <p className={`text-xs font-medium ${user.do_not_email ? 'text-orange-300' : 'text-zinc-400'}`}>
                    {user.do_not_email ? 'On Do Not Send list' : 'Receiving lifecycle emails'}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {user.do_not_email
                      ? 'This user will not receive any automatic emails.'
                      : 'Toggle to block all automated emails for this user.'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDoNotEmail}
                disabled={dneToggling}
                className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                  user.do_not_email
                    ? 'bg-orange-700 hover:bg-orange-600 text-white'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                }`}
              >
                {dneToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : user.do_not_email ? 'Remove' : 'Add'}
              </button>
            </div>

            {profile && (
              <Section title="Contact info">
                {profile.full_name && <Row label="Name" value={profile.full_name} />}
                {profile.email && <Row label="Email" value={profile.email} />}
                {profile.location && (
                  <Row label="Location" value={
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>
                  } />
                )}
                {profile.linkedin_url && (
                  <Row label="LinkedIn" value={
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 text-xs">
                      <Linkedin className="w-3 h-3" />
                      View profile <ExternalLink className="w-3 h-3" />
                    </a>
                  } />
                )}
              </Section>
            )}
          </>
        )}

        {activeTab === 'docs' && (
          <Section title="Experience library">
            {resumes.length === 0 ? (
              <p className="text-zinc-600 text-xs py-2">No documents uploaded.</p>
            ) : (
              <div className="space-y-0">
                {resumes.map(doc => {
                  const isExpanded = expandedDocId === doc.id;
                  const content = docContentMap[doc.id];
                  const isLoading = loadingDocId === doc.id;
                  return (
                    <div key={doc.id} className="border-b border-zinc-800/50 last:border-0">
                      <button
                        onClick={() => loadDocContent(doc.id)}
                        className="w-full flex items-start justify-between gap-2 py-2 text-left hover:bg-zinc-800/20 rounded transition-colors"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-300 truncate">{doc.title}</p>
                            <p className="text-xs text-zinc-600">
                              {doc.item_type.replace('_', ' ')}{doc.is_default ? ' · default' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-zinc-600">{timeAgo(doc.created_at)}</span>
                          {isLoading
                            ? <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />
                            : isExpanded
                              ? <ChevronUp className="w-3 h-3 text-zinc-600" />
                              : <ChevronDown className="w-3 h-3 text-zinc-600" />
                          }
                        </div>
                      </button>
                      {isExpanded && (
                        content === null
                          ? <p className="text-xs text-zinc-600 px-2 pb-2">No content available.</p>
                          : content
                            ? <DocContentViewer content={content} />
                            : null
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'resumes' && (
          <Section title={`AI résumés (${applications.total} total)`}>
            {applications.recent.length === 0 ? (
              <p className="text-zinc-600 text-xs py-2">No résumés generated yet.</p>
            ) : (
              <div className="space-y-2">
                {applications.recent.map(app => {
                  const isExpanded = expandedAppId === app.id;
                  const content = appContentMap[app.id];
                  const isLoading = loadingAppId === app.id;
                  return (
                    <div key={app.id} className="border-b border-zinc-800/50 last:border-0">
                      <button
                        onClick={() => loadAppContent(app.id)}
                        className="w-full flex items-start justify-between gap-2 py-2 text-left hover:bg-zinc-800/20 rounded transition-colors"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-300 truncate">{app.job_title}</p>
                            <p className="text-xs text-zinc-600 truncate">{app.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-zinc-600">{timeAgo(app.created_at)}</span>
                          {isLoading
                            ? <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />
                            : isExpanded
                              ? <ChevronUp className="w-3 h-3 text-zinc-600" />
                              : <ChevronDown className="w-3 h-3 text-zinc-600" />
                          }
                        </div>
                      </button>
                      {isExpanded && content && (
                        <AppContentViewer content={content} company={app.company} jobTitle={app.job_title} />
                      )}
                    </div>
                  );
                })}
                {applications.total > applications.recent.length && (
                  <p className="text-xs text-zinc-600 pt-1">
                    + {applications.total - applications.recent.length} more
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'logs' && (
          <Section title="Recent API calls">
            {logs.length === 0 ? (
              <p className="text-zinc-600 text-xs py-2">No logged API calls.</p>
            ) : (
              <div className="space-y-1.5">
                {logs.map(log => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Footer — activity hint */}
      <div className="px-4 py-2 border-t border-zinc-800 shrink-0 flex items-center gap-1 text-[10px] text-zinc-700">
        <Activity className="w-3 h-3" />
        Joined {new Date(user.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
