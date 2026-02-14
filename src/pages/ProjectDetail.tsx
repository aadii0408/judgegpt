import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SubmissionProject, Score } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink, Github, Video, Save, FileText } from "lucide-react";

const CRITERIA = [
  { key: "innovation", label: "Innovation" },
  { key: "technical", label: "Technical Complexity" },
  { key: "impact", label: "Impact" },
  { key: "feasibility", label: "Feasibility" },
  { key: "presentation", label: "Presentation" },
] as const;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<SubmissionProject | null>(null);
  const [existingScore, setExistingScore] = useState<Score | null>(null);
  const [scores, setScores] = useState({ innovation: 5, technical: 5, impact: 5, feasibility: 5, presentation: 5 });
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [projRes, scoreRes] = await Promise.all([
        (supabase as any).from("projects").select("*").eq("id", id).maybeSingle(),
        (supabase as any).from("scores").select("*").eq("project_id", id).eq("judge_id", user.id).maybeSingle(),
      ]);
      if (projRes.data) setProject(projRes.data);
      if (scoreRes.data) {
        setExistingScore(scoreRes.data);
        setScores({
          innovation: scoreRes.data.innovation,
          technical: scoreRes.data.technical,
          impact: scoreRes.data.impact,
          feasibility: scoreRes.data.feasibility,
          presentation: scoreRes.data.presentation,
        });
        setJustification(scoreRes.data.justification);
      }
    };
    load();
  }, [id, user]);

  const saveScore = async () => {
    if (!user || !id) return;
    if (!justification.trim()) {
      toast({ title: "Justification required", description: "Please provide a justification for your scores.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (existingScore) {
        const { error } = await (supabase as any).from("scores").update({
          ...scores, justification,
        }).eq("id", existingScore.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("scores").insert({
          project_id: id, judge_id: user.id, ...scores, justification,
        });
        if (error) throw error;
      }

      // Update project status
      await (supabase as any).from("projects").update({ status: "Scored" }).eq("id", id);

      toast({ title: "Score saved!" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING...</div></div>;
  }

  const avg = ((scores.innovation + scores.technical + scores.impact + scores.feasibility + scores.presentation) / 5).toFixed(1);
  const summary = project.ai_summary;

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-logo text-xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <Badge variant="outline" className="font-logo text-[10px] tracking-wider">
            AVG: {avg}/10
          </Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-logo text-xl tracking-wider">{project.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{project.team_name}</p>
              </div>
              <Badge>{project.track}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem Statement</Label>
              <p className="text-sm mt-1">{project.problem_statement}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Solution</Label>
              <p className="text-sm mt-1">{project.description}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tech Stack</Label>
              <p className="text-sm mt-1">{project.tech_stack_used}</p>
            </div>
            {project.additional_notes && (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Notes</Label>
                <p className="text-sm mt-1">{project.additional_notes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {project.github_link && (
                <a href={project.github_link} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent"><Github className="h-3 w-3 mr-1" />GitHub</Badge>
                </a>
              )}
              {project.demo_video_link && (
                <a href={project.demo_video_link} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent"><Video className="h-3 w-3 mr-1" />Demo Video</Badge>
                </a>
              )}
              {project.website_url && (
                <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent"><ExternalLink className="h-3 w-3 mr-1" />Website</Badge>
                </a>
              )}
              {project.pitch_deck_url && (
                <a href={project.pitch_deck_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent"><FileText className="h-3 w-3 mr-1" />Pitch Deck</Badge>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Summary */}
        {summary && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="font-logo text-sm tracking-wider">AI SUMMARY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{summary.summary}</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Problem Solved:</span>
                  <p>{summary.problem_solved}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Key Innovation:</span>
                  <p>{summary.key_innovation}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Target Users:</span>
                  <p>{summary.target_users}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Tech Highlights:</span>
                  <p>{summary.tech_highlights}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="font-logo text-sm tracking-wider">
              {existingScore ? "UPDATE YOUR SCORE" : "SCORE THIS PROJECT"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {CRITERIA.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{label}</Label>
                  <span className={`text-lg font-logo font-bold ${scores[key] >= 8 ? "text-success" : scores[key] >= 6 ? "text-warning" : "text-destructive"}`}>
                    {scores[key]}
                  </span>
                </div>
                <Slider
                  value={[scores[key]]}
                  onValueChange={([v]) => setScores(s => ({ ...s, [key]: v }))}
                  min={1}
                  max={10}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1</span><span>10</span>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Justification *</Label>
              <Textarea
                placeholder="Explain your scoring rationale..."
                rows={4}
                value={justification}
                onChange={e => setJustification(e.target.value)}
              />
            </div>

            <Button onClick={saveScore} className="w-full font-logo tracking-wider" size="lg" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "SAVING..." : existingScore ? "UPDATE SCORE" : "SAVE SCORE"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
