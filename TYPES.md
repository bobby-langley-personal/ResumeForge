# ResumeForge Types Registry

## Core Types

### Model Types
- `ModelName` - Union type for AI model names (from lib/models.ts)

### Database Types

#### User
```typescript
interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}
```

#### Resume
```typescript
interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: ResumeContent;
  created_at: string;
  updated_at: string;
}
```

#### Application
```typescript
interface Application {
  id: string;
  user_id: string;
  resume_id: string;
  job_description: string;
  company_name: string;
  position_title: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
```

### Content Types

#### ResumeContent
```typescript
interface ResumeContent {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
}
```

#### PersonalInfo
```typescript
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  portfolio?: string;
}
```

#### Experience
```typescript
interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
}
```

#### Education
```typescript
interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: number;
}
```

### Status Types

#### ApplicationStatus
```typescript
type ApplicationStatus = 
  | 'draft' 
  | 'applied' 
  | 'interviewing' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';
```

### API Types

#### GenerateResumeRequest
```typescript
interface GenerateResumeRequest {
  jobDescription: string;
  userBackground: string;
  preferences?: ResumePreferences;
}
```

#### ResumePreferences
```typescript
interface ResumePreferences {
  template: string;
  emphasis: 'experience' | 'skills' | 'education';
  includeObjective: boolean;
}
```