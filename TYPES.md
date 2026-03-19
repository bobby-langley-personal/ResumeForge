# Types Documentation

This file contains a flat listing of all types, interfaces, and unions used in the ResumeForge codebase.

## AI Models
- `ModelType` - Union type of available AI model strings (SONNET, HAIKU)

## Auth & User Types
- `User` - User profile data structure
- `UserRole` - User permission levels

## Resume Types
- `Resume` - Complete resume data structure  
- `ResumeSection` - Individual resume sections
- `ResumeStatus` - Resume processing states

## Application Types
- `JobApplication` - Job application tracking data
- `ApplicationStatus` - Application workflow states

## API Response Types
- `APIResponse<T>` - Standard API response wrapper
- `StreamChunk<T>` - SSE streaming data chunks

## Database Types
(Types will be auto-generated from Supabase schema)

---
*This file is automatically updated when types are added or modified.*