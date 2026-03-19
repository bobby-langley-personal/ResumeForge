-- Add resume_content and cover_letter_content to applications table
ALTER TABLE applications ADD COLUMN resume_content TEXT;
ALTER TABLE applications ADD COLUMN cover_letter_content TEXT;