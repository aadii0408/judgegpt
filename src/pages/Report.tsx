import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JUDGES, type Project, type Evaluation, type FinalReport } from "@/lib/judges";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, MessageCircle, Volume2, VolumeX, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const JUDGE_COLORS = ["hsl(195,100%,50%)", "hsl(120,100%,40%)", "hsl(280,100%,60%)", "hsl(30,100%,50%)", "hsl(330,100%,60%)"];

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
  const [playingVoice, setPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      if (current >= target) { current = target; clearInterval(interval); }
      setAnimatedScore(Number(current.toFixed(1)));
    }, 30);
    return () => clearInterval(interval);
  }, [report]);

  const chartData = evaluations.map((e, i) => ({
    name: JUDGES[i]?.name.split(" ").pop() || e.judge_name,
    score: Number(e.score),
    fill: JUDGE_COLORS[i] || "#888",
  }));

  const stopVoice = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingVoice(false);
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim() || !project || evaluations.length === 0) return;
    setQaLoading(true);
    try {
      const q = qaQuestion.toLowerCase();
      let bestEval = evaluations[0];
      if (q.includes("technical") || q.includes("architecture")) bestEval = evaluations.find(e => e.judge_type === "technical") || bestEval;
      else if (q.includes("business") || q.includes("market")) bestEval = evaluations.find(e => e.judge_type === "business") || bestEval;
      else if (q.includes("ux") || q.includes("design")) bestEval = evaluations.find(e => e.judge_type === "product") || bestEval;
      else if (q.includes("risk") || q.includes("security")) bestEval = evaluations.find(e => e.judge_type === "risk") || bestEval;
      else if (q.includes("innovation") || q.includes("creative")) bestEval = evaluations.find(e => e.judge_type === "innovation") || bestEval;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-qa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
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

  const playVoice = async (text: string, voiceId: string) => {
    stopVoice();
    setPlayingVoice(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ text, voiceId }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingVoice(false); audioRef.current = null; };
      await audio.play();
    } catch {
      setPlayingVoice(false);
    }
  };

  const shareReport = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  };

  if (!project || !report) {
    return <div className="flex min-h-screen items-center justify-center bg-background grid-bg"><div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING REPORT...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="font-logo text-xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <Button variant="outline" size="sm" onClick={shareReport} className="font-logo text-[10px] tracking-wider">
            <Share2 className="mr-1 h-3 w-3" /> SHARE
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{project.name}</h2>
          <div className={`text-7xl font-logo font-black ${animatedScore >= 8 ? "text-success" : animatedScore >= 6 ? "text-warning" : "text-destructive"}`}>
            {animatedScore}
          </div>
          <p className="text-xs text-muted-foreground font-mono">OVERALL SCORE / 10</p>
          <Card className="mx-auto max-w-xl">
            <CardContent className="p-4">
              <p className="text-sm italic text-foreground">{report.verdict}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-logo text-sm tracking-wider">JUDGE BREAKDOWN</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis domain={[0, 10]} fontSize={11} />
                <Tooltip />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-success font-logo tracking-wider">✅ STRENGTHS</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {report.consensus_strengths.map((s, i) => <Badge key={i} variant="outline" className="text-[10px] border-success/30 text-success">{s}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-warning font-logo tracking-wider">⚠️ WEAKNESSES</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {report.critical_weaknesses.map((w, i) => <Badge key={i} variant="outline" className="text-[10px] border-warning/30 text-warning">{w}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-destructive font-logo tracking-wider">🚨 IMPROVEMENTS</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1">
                {report.improvements.map((imp, i) => <li key={i} className="text-xs text-foreground">{imp}</li>)}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-logo text-sm tracking-wider flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> ASK THE JUDGES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Ask a follow-up question..." value={qaQuestion} onChange={e => setQaQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askQuestion()} className="bg-background" />
              <Button onClick={askQuestion} disabled={qaLoading || !qaQuestion.trim()}>
                {qaLoading ? "..." : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {qaResponse && (
              <div className="rounded-md bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-muted-foreground font-mono">{qaResponse.judge_name} ({qaResponse.judge_type})</p>
                  {(() => {
                    const judge = JUDGES.find(j => j.name === qaResponse.judge_name);
                    return judge ? (
                      playingVoice ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stopVoice}>
                          <VolumeX className="h-3 w-3 text-destructive" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playVoice(qaResponse.response, judge.voiceId)}>
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      )
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
