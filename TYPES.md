# Types and Interfaces

Flat listing of all types, interfaces, and unions in the ResumeForge codebase.

## Database Types

### Database
- Main database schema interface with tables, views, functions, enums, and composite types

### Json  
- Union type for JSON values: string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

### Users Table
- Row: id (string), email (string), full_name (string | null), created_at (string), updated_at (string)
- Insert: id (string), email (string), full_name (optional), created_at (optional), updated_at (optional) 
- Update: all fields optional

### Resumes Table
- Row: id (string), user_id (string), title (string), content (Json: { text: string, fileName?: string }), item_type (ItemType), is_default (boolean), created_at (string), updated_at (string)
- Insert: id (optional), user_id (string), title (string), content (Json), item_type (optional, default 'resume'), is_default (optional, default false), created_at (optional), updated_at (optional)
- Update: all fields optional
- item_type values: 'resume' | 'cover_letter' | 'portfolio' | 'other'
- Only one item per user can have is_default = true (enforced by partial unique index)

### Applications Table  
- Row: id (string), user_id (string), resume_id (string | null), job_title (string), company (string), job_description (string), resume_content (string | null), cover_letter_content (string | null), status (ApplicationStatus), application_date (string), fit_analysis (Json | null), created_at (string), updated_at (string)
- Insert: id (optional), user_id (string), resume_id (optional), job_title (string), company (string), job_description (string), resume_content (optional), cover_letter_content (optional), status (optional), application_date (optional), fit_analysis (optional), created_at (optional), updated_at (optional)
- Update: all fields optional

## Model Types

### ModelType
- Union of SONNET and HAIKU model strings

### MODELS
- Object containing SONNET: 'claude-3-5-sonnet-20241022', HAIKU: 'claude-3-5-haiku-20241022'

## Application Status

### ApplicationStatus
- Union type: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'

## Fit Analysis Types

### OverallFit
- Union type: 'Strong Fit' | 'Good Fit' | 'Stretch Role'

### RoleType
- Union type: 'technical' | 'management' | 'sales' | 'customer_success' | 'research' | 'other'

### FitAnalysis
- Interface: overallFit (OverallFit), strengths (string[]), gaps (string[]), suggestions (string[]), roleType (RoleType)