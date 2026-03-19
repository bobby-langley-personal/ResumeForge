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
- Row: id (string), user_id (string), title (string), content (Json), created_at (string), updated_at (string)
- Insert: id (optional), user_id (string), title (string), content (Json), created_at (optional), updated_at (optional)
- Update: all fields optional

### Applications Table  
- Row: id (string), user_id (string), resume_id (string | null), job_title (string), company (string), job_description (string), status (ApplicationStatus), application_date (string), resume_content (string | null), cover_letter_content (string | null), created_at (string), updated_at (string)
- Insert: id (optional), user_id (string), resume_id (optional), job_title (string), company (string), job_description (string), status (optional), application_date (optional), resume_content (optional), cover_letter_content (optional), created_at (optional), updated_at (optional)
- Update: all fields optional

## Model Types

### ModelType
- Union of SONNET and HAIKU model strings

### MODELS
- Object containing SONNET: 'claude-3-5-sonnet-20241022', HAIKU: 'claude-3-5-haiku-20241022'

## Application Status

### ApplicationStatus
- Union type: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'