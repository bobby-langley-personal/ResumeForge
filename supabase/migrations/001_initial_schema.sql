-- Enable RLS on all tables
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (clerk_user_id = auth.uid()::text);

-- Resumes table
CREATE TABLE resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- RLS policies for resumes table
CREATE POLICY "Users can view their own resumes" ON resumes
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can insert their own resumes" ON resumes
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can update their own resumes" ON resumes
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can delete their own resumes" ON resumes
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

-- Applications table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  job_description TEXT NOT NULL,
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for applications table
CREATE POLICY "Users can view their own applications" ON applications
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can insert their own applications" ON applications
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can update their own applications" ON applications
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can delete their own applications" ON applications
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
  );

-- Indexes for better performance
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();