
-- Create track enum
CREATE TYPE public.project_track AS ENUM ('AI Agents', 'Web3', 'DevTools', 'Healthcare', 'Other');

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  architecture TEXT NOT NULL,
  demo_transcript TEXT,
  track project_track NOT NULL DEFAULT 'Other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects are publicly readable" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT WITH CHECK (true);

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  judge_name TEXT NOT NULL,
  judge_type TEXT NOT NULL,
  score NUMERIC(3,1) NOT NULL DEFAULT 0,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  concerns TEXT[] NOT NULL DEFAULT '{}',
  reasoning TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluations are publicly readable" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluations" ON public.evaluations FOR INSERT WITH CHECK (true);

-- Final reports table
CREATE TABLE public.final_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  overall_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  consensus_strengths TEXT[] NOT NULL DEFAULT '{}',
  critical_weaknesses TEXT[] NOT NULL DEFAULT '{}',
  improvements TEXT[] NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL DEFAULT '',
  debate_transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Final reports are publicly readable" ON public.final_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert final reports" ON public.final_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update final reports" ON public.final_reports FOR UPDATE USING (true);
