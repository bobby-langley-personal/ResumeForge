# Claude Development Guide

This file contains important guidelines and rules for working with the ResumeForge codebase.

## Database Schema Rules

The schema defined in TYPES.md is the source of truth. Never reference columns that are not defined there.

### Applications Table Schema
Current valid columns:
- `id` (string) - Primary key
- `user_id` (string) - Foreign key to users
- `company` (string) - Company name
- `job_title` (string) - Position title
- `job_description` (string) - Job posting description
- `job_url` (string | null) - Link to job posting
- `source_resume_id` (string | null) - ID of source resume used
- `generated_resume` (string | null) - Generated resume content
- `generated_cover_letter` (string | null) - Generated cover letter content
- `fit_analysis` (jsonb | null) - AI-generated fit analysis containing overall fit rating, strengths, gaps, and suggestions
- `status` (ApplicationStatus) - Application status enum
- `created_at` (string) - Auto-populated by Postgres default
- `updated_at` (string) - Auto-updated by Postgres

**If a new column is genuinely needed:**
1. Add it to the schema definition in TYPES.md FIRST
2. Write the migration SQL file in `/supabase/migrations/` 
   following the existing naming convention (e.g. `003_add_column.sql`)
3. Include a comment in the migration file with instructions:
```sql
   -- Run this in the Supabase SQL editor:
   -- Dashboard → SQL Editor → paste and run
   alter table applications add column if not exists your_column text;
```
4. Only then write the application code that uses the new column

**Never:**
- Insert into columns that don't exist in the schema above
- Add columns to insert/select statements before adding them
  to the schema here and creating a migration file
- Assume a column exists because it seems logical — check this
  file first

## Development Guidelines

- Always read TYPES.md for current type definitions before making database changes
- Use existing patterns and conventions from the codebase
- Follow the architecture rules defined in the repository context