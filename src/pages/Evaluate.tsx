import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JUDGES, type Project, type Evaluation } from "@/lib/judges";
import { useToast } from "@/hooks/use-toast";
import JudgeCard from "@/components/JudgeCard";
import ProjectSummary from "@/components/ProjectSummary";
import LiveDebate from "@/components/LiveDebate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";

export default function Evaluate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [evaluations, setEvaluations] = useState<(Evaluation | null)[]>(Array(5).fill(null));
  const [currentJudge, setCurrentJudge] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);
  const [debateConsensus, setDebateConsensus] = useState<{ score: number; message: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast({ title: "Project not found", variant: "destructive" }); navigate("/"); return; }
      setProject(data as unknown as Project);
    };
    fetchProject();
  }, [id]);

  const evaluateJudge = useCallback(async (judgeIndex: number, proj: Project) => {
    const judge = JUDGES[judgeIndex];
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ project: proj, judgeType: judge.type }),
      });
      if (!response.ok) throw new Error("Evaluation failed");
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const { data: saved, error: saveError } = await supabase.from("evaluations").insert({
        project_id: proj.id, judge_name: judge.name, judge_type: judge.type,
        score: result.score, strengths: result.strengths, weaknesses: result.weaknesses,
        concerns: result.concerns, reasoning: result.reasoning,
      }).select().single();
      if (saveError) throw saveError;
      return saved as unknown as Evaluation;
    } catch (err: any) {
      toast({ title: `${judge.name} evaluation failed`, description: err.message, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const startEvaluation = useCallback(async () => {
    if (!project || isEvaluating) return;
    setIsEvaluating(true);
    const results: (Evaluation | null)[] = [...evaluations];
    for (let i = 0; i < JUDGES.length; i++) {
      setCurrentJudge(i);
      const result = await evaluateJudge(i, project);
      results[i] = result;
      setEvaluations([...results]);
    }
    setCurrentJudge(5);
    setIsEvaluating(false);
    setAllDone(true);
  }, [project, isEvaluating, evaluateJudge, evaluations]);

  useEffect(() => {
    if (project && !isEvaluating && evaluations.every(e => e === null)) { startEvaluation(); }
  }, [project]);

  const playVoice = async (text: string, voiceId: string) => {
    setPlayingVoice(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingVoice(false);
      await audio.play();
    } catch { toast({ title: "Voice playback failed", variant: "destructive" }); setPlayingVoice(false); }
  };

  const handleConsensus = async (score: number, message: string) => {
    setDebateConsensus({ score, message });
    if (!project) return;
    const validEvals = evaluations.filter(Boolean) as Evaluation[];
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-consensus`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ evaluations: validEvals, project }),
      });
      if (!response.ok) throw new Error("Consensus generation failed");
      const report = await response.json();
      await supabase.from("final_reports").insert({
        project_id: project.id, overall_score: score,
        consensus_strengths: report.consensusStrengths, critical_weaknesses: report.criticalWeaknesses,
        improvements: report.improvements, verdict: message,
      });
    } catch (err: any) {
      console.error("Report save error:", err);
    }
  };

  const goToReport = () => { if (project) navigate(`/report/${project.id}`); };

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center bg-background grid-bg"><div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING...</div></div>;
  }

  const completedCount = evaluations.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="font-logo text-xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">Judge {Math.min(currentJudge + 1, 5)} / 5</span>
            <Progress value={(completedCount / 5) * 100} className="w-32" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
          <aside className="hidden lg:block">
            <ProjectSummary project={project} />
          </aside>
          <div className="space-y-4">
            <h2 className="font-logo text-2xl font-bold tracking-wider">LIVE EVALUATION</h2>
            {JUDGES.map((_, i) => (
              <JudgeCard key={i} evaluation={evaluations[i]} judgeIndex={i} isActive={currentJudge === i && isEvaluating} isComplete={evaluations[i] !== null} onPlayVoice={playVoice} isPlayingVoice={playingVoice} />
            ))}
            
            {allDone && (
              <div className="space-y-4 pt-4">
                <LiveDebate
                  evaluations={evaluations.filter(Boolean) as Evaluation[]}
                  project={project}
                  onConsensus={handleConsensus}
                />
                {debateConsensus && (
                  <div className="flex justify-center">
                    <Button size="lg" onClick={goToReport} className="font-logo tracking-wider">
                      VIEW FULL REPORT <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
