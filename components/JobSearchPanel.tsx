'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, MapPin, Building2, Check, ExternalLink, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import type { JobResult } from '@/app/api/search-jobs/route';

interface Props {
  onJobSelect: (job: { company: string; jobTitle: string; jobDescription: string; jobUrl: string }) => void;
  disabled?: boolean;
}

function timeAgo(isoDate: string): string {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function formatSalary(job: JobResult): string {
  if (!job.salaryMin && !job.salaryMax) return 'Salary n/a';
  const currency = job.salaryCurrency ?? 'USD';
  const period = job.salaryPeriod ? `/${job.salaryPeriod.toLowerCase().replace('year', 'yr').replace('month', 'mo').replace('hour', 'hr')}` : '';
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${period}`;
  if (job.salaryMin) return `From ${fmt(job.salaryMin)}${period}`;
  return `Up to ${fmt(job.salaryMax!)}${period}`;
}

export default function JobSearchPanel({ onJobSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setJobs([]);
    setSelectedId(null);
    setExpandedId(null);
    try {
      const params = new URLSearchParams({ query: query.trim() });
      if (location.trim()) params.set('location', location.trim());
      const res = await fetch(`/api/search-jobs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Search unavailable — paste the job description manually.');
        return;
      }
      setJobs(data.jobs ?? []);
      if ((data.jobs ?? []).length === 0) setError('No results found. Try different keywords or paste a job description below.');
    } catch {
      setError('Search unavailable — paste the job description manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (job: JobResult) => {
    setSelectedId(job.id);
    onJobSelect({
      company: job.company,
      jobTitle: job.title,
      jobDescription: job.description,
      jobUrl: job.url,
    });
    setJobs([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Job title or keywords"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          disabled={disabled || loading}
          className="flex-1"
        />
        <Input
          placeholder="Location (optional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          disabled={disabled || loading}
          className="w-44"
        />
        <Button type="button" variant="outline" onClick={() => handleSearch()} disabled={!query.trim() || disabled || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {error && <p className="text-xs text-muted-foreground">{error}</p>}

      {selectedId && jobs.length === 0 && (
        <p className="text-xs text-green-600 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          Job imported — review the fields below before generating.
        </p>
      )}

      {jobs.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {jobs.map(job => {
            const isExpanded = expandedId === job.id;
            const salary = formatSalary(job);
            return (
              <div key={job.id} className="p-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground">{job.title}</p>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View job posting"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />{salary}
                      </span>
                      {job.postedAt && <span>{timeAgo(job.postedAt)}</span>}
                    </div>

                    {/* Description: collapsed preview or expanded full text */}
                    {isExpanded ? (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                        {job.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {job.description?.slice(0, 150)}…
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      {isExpanded
                        ? <><ChevronUp className="w-3 h-3" />Show less</>
                        : <><ChevronDown className="w-3 h-3" />Show full description</>}
                    </button>
                  </div>

                  {/* Right: action */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleSelect(job)}
                  >
                    Use this job
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
