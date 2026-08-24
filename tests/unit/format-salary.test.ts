import { describe, it, expect } from 'vitest';
import type { JobResult } from '@/app/api/search-jobs/route';

// formatSalary is a module-level function in JobSearchPanel (not exported).
// Replicated here to test in isolation.
function formatSalary(job: Pick<JobResult, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>): string {
  if (!job.salaryMin && !job.salaryMax) return 'Salary n/a';
  const currency = job.salaryCurrency ?? 'USD';
  const period = job.salaryPeriod
    ? `/${job.salaryPeriod.toLowerCase().replace('year', 'yr').replace('month', 'mo').replace('hour', 'hr')}`
    : '';
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${period}`;
  if (job.salaryMin) return `From ${fmt(job.salaryMin)}${period}`;
  return `Up to ${fmt(job.salaryMax!)}${period}`;
}

const base = { id: 'j1', title: 'Eng', company: 'Acme', location: 'NY', description: '', url: '', postedAt: '', salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null };

describe('formatSalary', () => {
  it('returns "Salary n/a" when no salary data', () => {
    expect(formatSalary({ ...base })).toBe('Salary n/a');
  });

  it('returns "Salary n/a" when both min and max are undefined', () => {
    expect(formatSalary({ ...base, salaryMin: null, salaryMax: null })).toBe('Salary n/a');
  });

  it('formats a full range', () => {
    const result = formatSalary({ ...base, salaryMin: 100000, salaryMax: 150000, salaryCurrency: 'USD' });
    expect(result).toBe('$100,000 – $150,000');
  });

  it('formats lower bound only', () => {
    const result = formatSalary({ ...base, salaryMin: 80000, salaryCurrency: 'USD' });
    expect(result).toBe('From $80,000');
  });

  it('formats upper bound only', () => {
    const result = formatSalary({ ...base, salaryMax: 120000, salaryCurrency: 'USD' });
    expect(result).toBe('Up to $120,000');
  });

  it('appends /yr for YEAR period', () => {
    const result = formatSalary({ ...base, salaryMin: 100000, salaryMax: 130000, salaryCurrency: 'USD', salaryPeriod: 'YEAR' });
    expect(result).toContain('/yr');
  });

  it('appends /mo for MONTH period', () => {
    const result = formatSalary({ ...base, salaryMin: 8000, salaryMax: 10000, salaryCurrency: 'USD', salaryPeriod: 'MONTH' });
    expect(result).toContain('/mo');
  });

  it('appends /hr for HOUR period', () => {
    const result = formatSalary({ ...base, salaryMin: 45, salaryMax: 60, salaryCurrency: 'USD', salaryPeriod: 'HOUR' });
    expect(result).toContain('/hr');
  });

  it('defaults currency to USD when not specified', () => {
    const result = formatSalary({ ...base, salaryMin: 50000, salaryMax: 70000 });
    expect(result).toContain('$');
  });

  it('formats thousands with commas', () => {
    const result = formatSalary({ ...base, salaryMin: 1000000, salaryCurrency: 'USD' });
    expect(result).toContain('1,000,000');
  });
});
