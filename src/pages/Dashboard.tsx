import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SubmissionProject, Score } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { LogOut, ExternalLink, Github, Video } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<SubmissionProject[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [projRes, scoresRes] = await Promise.all([
        (supabase as any).from("projects").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("scores").select("*"),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (scoresRes.data) setScores(scoresRes.data);
      setLoading(false);
    };
    load();
  }, []);

  const getProjectScores = (projectId: string) => {
    return scores.filter(s => s.project_id === projectId);
  };

  const getAverageScore = (projectId: string) => {
    const ps = getProjectScores(projectId);
    if (ps.length === 0) return null;
    const avg = ps.reduce((sum, s) => {
      return sum + (s.innovation + s.technical + s.impact + s.feasibility + s.presentation) / 5;
    }, 0) / ps.length;
    return avg.toFixed(1);
  };

  const getStatus = (projectId: string) => {
    return getProjectScores(projectId).length > 0 ? "Scored" : "Not Scored";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-logo text-2xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-logo text-2xl font-bold tracking-wider">JUDGE DASHBOARD</h2>
            <p className="text-sm text-muted-foreground mt-1">{projects.length} projects submitted</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No projects submitted yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const avg = getAverageScore(project.id);
              const status = getStatus(project.id);
              const summary = project.ai_summary;

              return (
                <HoverCard key={project.id} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Card
                      className="cursor-pointer hover:border-foreground/30 transition-all group"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm group-hover:text-foreground truncate">{project.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{project.team_name}</p>
                          </div>
                          {avg && (
                            <span className={`text-2xl font-logo font-bold ml-3 ${Number(avg) >= 8 ? "text-success" : Number(avg) >= 6 ? "text-warning" : "text-destructive"}`}>
                              {avg}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{project.track}</Badge>
                          <Badge variant={status === "Scored" ? "default" : "outline"} className="text-[10px]">
                            {status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" side="right">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm">{project.name}</h4>
                        <p className="text-xs text-muted-foreground">{project.team_name} • {project.track}</p>
                      </div>
                      {summary ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-foreground">{summary.summary}</p>
                          <div>
                            <span className="font-semibold text-muted-foreground">Problem: </span>
                            <span>{summary.problem_solved}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Innovation: </span>
                            <span>{summary.key_innovation}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Tech: </span>
                            <span>{summary.tech_highlights}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">AI summary generating...</p>
                      )}
                      <div className="flex gap-2">
                        {project.github_link && (
                          <a href={project.github_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent"><Github className="h-3 w-3 mr-1" />GitHub</Badge>
                          </a>
                        )}
                        {project.demo_video_link && (
                          <a href={project.demo_video_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent"><Video className="h-3 w-3 mr-1" />Demo</Badge>
                          </a>
                        )}
                        {project.website_url && (
                          <a href={project.website_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent"><ExternalLink className="h-3 w-3 mr-1" />Site</Badge>
                          </a>
                        )}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
