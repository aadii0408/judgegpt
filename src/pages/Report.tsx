import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JUDGES, type Project, type Evaluation, type FinalReport } from "@/lib/judges";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Share2, MessageCircle, Volume2, Swords, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const JUDGE_COLORS = ["hsl(217,91%,60%)", "hsl(160,84%,39%)", "hsl(263,70%,50%)", "hsl(38,92%,50%)", "hsl(330,81%,60%)"];

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaResponse, setQaResponse] = useState<{ response: string; judge_name: string; judge_type: string } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [debate, setDebate] = useState<{ debate: string; highJudge: any; lowJudge: any } | null>(null);
  const [debateLoading, setDebateLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [projRes, evalRes, reportRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).maybeSingle(),
        supabase.from("evaluations").select("*").eq("project_id", id).order("created_at"),
        supabase.from("final_reports").select("*").eq("project_id", id).maybeSingle(),
      ]);
      if (projRes.data) setProject(projRes.data as unknown as Project);
      if (evalRes.data) setEvaluations(evalRes.data as unknown as Evaluation[]);
      if (reportRes.data) setReport(reportRes.data as unknown as FinalReport);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!report) return;
    const target = report.overall_score;
    let current = 0;
    const step = target / 40;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setAnimatedScore(Number(current.toFixed(1)));
    }, 30);
    return () => clearInterval(interval);
  }, [report]);

  const chartData = evaluations.map((e, i) => ({
    name: JUDGES[i]?.name.split(" ").pop() || e.judge_name,
    score: Number(e.score),
    fill: JUDGE_COLORS[i] || "#888",
  }));

  const askQuestion = async () => {
    if (!qaQuestion.trim() || !project || evaluations.length === 0) return;
    setQaLoading(true);
    try {
      // Pick most relevant judge by keyword matching
      const q = qaQuestion.toLowerCase();
      let bestEval = evaluations[0];
      if (q.includes("technical") || q.includes("architecture") || q.includes("code")) bestEval = evaluations.find(e => e.judge_type === "technical") || bestEval;
      else if (q.includes("business") || q.includes("market") || q.includes("revenue")) bestEval = evaluations.find(e => e.judge_type === "business") || bestEval;
      else if (q.includes("ux") || q.includes("design") || q.includes("user")) bestEval = evaluations.find(e => e.judge_type === "product") || bestEval;
      else if (q.includes("risk") || q.includes("security") || q.includes("safety")) bestEval = evaluations.find(e => e.judge_type === "risk") || bestEval;
      else if (q.includes("innovation") || q.includes("creative") || q.includes("novel")) bestEval = evaluations.find(e => e.judge_type === "innovation") || bestEval;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-qa`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question: qaQuestion, project, evaluation: bestEval }),
        }
      );
      if (!response.ok) throw new Error("Q&A failed");
      const data = await response.json();
      setQaResponse(data);
      setQaQuestion("");
    } catch (err: any) {
      toast({ title: "Q&A failed", description: err.message, variant: "destructive" });
    } finally {
      setQaLoading(false);
    }
  };

  const triggerDebate = async () => {
    if (!project || evaluations.length < 2) return;
    setDebateLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-debate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ evaluations, project }),
        }
      );
      if (!response.ok) throw new Error("Debate failed");
      const data = await response.json();
      setDebate(data);

      if (data.debate) {
        await supabase.from("final_reports").update({ debate_transcript: data.debate }).eq("project_id", project.id);
      }
    } catch (err: any) {
      toast({ title: "Debate failed", description: err.message, variant: "destructive" });
    } finally {
      setDebateLoading(false);
    }
  };

  const playVoice = async (text: string, voiceId: string) => {
    setPlayingVoice(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingVoice(false);
      await audio.play();
    } catch {
      setPlayingVoice(false);
    }
  };

  const shareReport = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Share this URL with others." });
  };

  if (!project || !report) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading report...</div></div>;
  }

  const scores = evaluations.map(e => Number(e.score));
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const hasDebateGap = maxScore - minScore >= 3;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">JudgeGPT</h1>
          </div>
          <Button variant="outline" size="sm" onClick={shareReport}>
            <Share2 className="mr-1 h-4 w-4" /> Share Report
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Hero Score */}
        <div className="text-center space-y-4" ref={scoreRef}>
          <h2 className="text-lg font-medium text-muted-foreground">{project.name}</h2>
          <div className={`text-7xl font-bold ${animatedScore >= 8 ? "text-success" : animatedScore >= 6 ? "text-warning" : "text-destructive"}`}>
            {animatedScore}
          </div>
          <p className="text-sm text-muted-foreground">Overall Score out of 10</p>
          <Card className="mx-auto max-w-xl">
            <CardContent className="p-4">
              <p className="text-sm italic text-foreground">{report.verdict}</p>
            </CardContent>
          </Card>
        </div>

        {/* Judge Breakdown Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Judge Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 10]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Consensus */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-success">✅ Strengths</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {report.consensus_strengths.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs border-success/30 text-success">{s}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-warning">⚠️ Weaknesses</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {report.critical_weaknesses.map((w, i) => (
                <Badge key={i} variant="outline" className="text-xs border-warning/30 text-warning">{w}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">🚨 Improvements</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1">
                {report.improvements.map((imp, i) => (
                  <li key={i} className="text-xs text-foreground">{imp}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Debate */}
        {hasDebateGap && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5" /> Judge Debate
                </CardTitle>
                {!debate && (
                  <Button size="sm" onClick={triggerDebate} disabled={debateLoading}>
                    {debateLoading ? "Generating..." : "Start Debate"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Score gap of {(maxScore - minScore).toFixed(1)} points detected</p>
            </CardHeader>
            {debate?.debate && (
              <CardContent>
                <div className="space-y-3 text-sm">
                  {debate.debate.split("\n").filter(Boolean).map((line, i) => {
                    const isHigh = line.startsWith(debate.highJudge?.name);
                    const isLow = line.startsWith(debate.lowJudge?.name);
                    return (
                      <div key={i} className={`p-3 rounded-lg ${isHigh ? "bg-success/10 border-l-2 border-success" : isLow ? "bg-destructive/10 border-l-2 border-destructive" : "bg-muted"}`}>
                        <p>{line}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Q&A */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Ask the Judges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a follow-up question..."
                value={qaQuestion}
                onChange={e => setQaQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askQuestion()}
              />
              <Button onClick={askQuestion} disabled={qaLoading || !qaQuestion.trim()}>
                {qaLoading ? "..." : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {qaResponse && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{qaResponse.judge_name} ({qaResponse.judge_type})</p>
                  {(() => {
                    const judge = JUDGES.find(j => j.name === qaResponse.judge_name);
                    return judge ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playVoice(qaResponse.response, judge.voiceId)} disabled={playingVoice}>
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    ) : null;
                  })()}
                </div>
                <p className="text-sm">{qaResponse.response}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
