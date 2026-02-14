// Local types for the new schema (supplements auto-generated types)
export interface SubmissionProject {
  id: string;
  name: string;
  team_name: string;
  track: string;
  description: string;
  problem_statement: string;
  tech_stack_used: string;
  github_link: string | null;
  demo_video_link: string | null;
  website_url: string | null;
  pitch_deck_url: string | null;
  additional_notes: string | null;
  ai_summary: AiSummary | null;
  status: string;
  created_at: string;
}

export interface AiSummary {
  summary: string;
  problem_solved: string;
  key_innovation: string;
  target_users: string;
  tech_highlights: string;
}

export interface Score {
  id: string;
  project_id: string;
  judge_id: string;
  innovation: number;
  technical: number;
  impact: number;
  feasibility: number;
  presentation: number;
  justification: string;
  created_at: string;
}

export const TRACKS = ["AI Agents", "Web3", "DevTools", "Healthcare", "Other"] as const;
export type Track = typeof TRACKS[number];
