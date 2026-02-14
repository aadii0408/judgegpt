
-- Create storage bucket for project videos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-videos', 'project-videos', true);

-- Allow anyone to upload videos
CREATE POLICY "Anyone can upload project videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-videos');

-- Allow anyone to read project videos
CREATE POLICY "Project videos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-videos');
