-- Add resume_content and cover_letter_content fields to applications table
ALTER TABLE applications 
ADD COLUMN resume_content TEXT,
ADD COLUMN cover_letter_content TEXT;