export interface Judge {
  name: string;
  type: string;
  role: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  voiceId: string;
  initials: string;
}

export const JUDGES: Judge[] = [
  {
    name: "Dr. Alex Chen",
    type: "technical",
    role: "Technical Depth",
    colorClass: "text-judge-technical",
    bgClass: "bg-judge-technical",
    borderClass: "border-judge-technical",
    textClass: "text-judge-technical",
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    initials: "AC",
  },
  {
    name: "Maya Patel",
    type: "business",
    role: "Business Impact",
    colorClass: "text-judge-business",
    bgClass: "bg-judge-business",
    borderClass: "border-judge-business",
    textClass: "text-judge-business",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    initials: "MP",
  },
  {
    name: "Jordan Blake",
    type: "product",
    role: "Product & UX",
    colorClass: "text-judge-product",
    bgClass: "bg-judge-product",
    borderClass: "border-judge-product",
    textClass: "text-judge-product",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    initials: "JB",
  },
  {
    name: "Sam Rodriguez",
    type: "risk",
    role: "Risk & Safety",
    colorClass: "text-judge-risk",
    bgClass: "bg-judge-risk",
    borderClass: "border-judge-risk",
    textClass: "text-judge-risk",
    voiceId: "CwhRBWXzGAHq8TQ4Fs17",
    initials: "SR",
  },
  {
    name: "Riley Kim",
    type: "innovation",
    role: "Innovation",
    colorClass: "text-judge-innovation",
    bgClass: "bg-judge-innovation",
    borderClass: "border-judge-innovation",
    textClass: "text-judge-innovation",
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    initials: "RK",
  },
];

export const TRACKS = ["AI Agents", "Web3", "DevTools", "Healthcare", "Other"] as const;
export type Track = typeof TRACKS[number];

export interface Evaluation {
  id: string;
  project_id: string;
  judge_name: string;
  judge_type: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  concerns: string[];
  reasoning: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  architecture: string;
  demo_transcript: string | null;
  track: Track;
  presentation_url: string | null;
  website_url: string | null;
  video_url: string | null;
  created_at: string;
}

export interface FinalReport {
  id: string;
  project_id: string;
  overall_score: number;
  consensus_strengths: string[];
  critical_weaknesses: string[];
  improvements: string[];
  verdict: string;
  debate_transcript: string | null;
  created_at: string;
}

export const EXAMPLE_PROJECT = {
  name: "CodeReview AI",
  description: "An AI-powered code review assistant that analyzes pull requests in real-time, providing inline suggestions for code quality, security vulnerabilities, and performance optimizations. Integrates with GitHub and GitLab.",
  architecture: "Multi-agent pipeline: PR diff parser → AST analyzer → Security scanner agent → Performance profiler agent → Style checker agent → Aggregator that synthesizes all findings into prioritized inline comments. Uses RAG over the repo's existing codebase for context-aware suggestions.",
  demo_transcript: "Showed a live demo reviewing a 200-line PR. Caught a SQL injection vulnerability, suggested 3 performance improvements, and flagged inconsistent error handling patterns. Average review time: 12 seconds.",
  track: "DevTools" as Track,
};
