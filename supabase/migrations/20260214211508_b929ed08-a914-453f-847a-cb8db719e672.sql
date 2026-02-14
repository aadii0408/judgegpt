
-- Add new columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_name text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS problem_statement text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tech_stack_used text DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_link text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS demo_video_link text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pitch_deck_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS additional_notes text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_summary jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Submitted';
ALTER TABLE public.projects ALTER COLUMN architecture SET DEFAULT '';

-- Allow project status updates
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE USING (true);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Role system
CREATE TYPE public.app_role AS ENUM ('admin', 'judge', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Scores table
CREATE TABLE IF NOT EXISTS public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  judge_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  innovation numeric DEFAULT 0,
  technical numeric DEFAULT 0,
  impact numeric DEFAULT 0,
  feasibility numeric DEFAULT 0,
  presentation numeric DEFAULT 0,
  justification text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, judge_id)
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Judges can view scores" ON public.scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'judge') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Judges can insert scores" ON public.scores FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'judge') OR public.has_role(auth.uid(), 'admin')) AND judge_id = auth.uid());
CREATE POLICY "Judges can update own scores" ON public.scores FOR UPDATE TO authenticated USING (judge_id = auth.uid());

-- Pitch decks storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pitch-decks', 'pitch-decks', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Anyone can upload pitch decks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pitch-decks');
CREATE POLICY "Pitch decks are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'pitch-decks');
