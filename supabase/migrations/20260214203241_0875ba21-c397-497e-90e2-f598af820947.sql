
-- Add new fields for presentation, website URL, and video URL
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS presentation_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;
