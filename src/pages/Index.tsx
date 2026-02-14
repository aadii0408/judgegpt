import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TRACKS, JUDGES, EXAMPLE_PROJECT, type Track, type Project, type Evaluation, type FinalReport } from "@/lib/judges";
import { Send, Eye, Globe, FileVideo, Presentation, Upload, ArrowRight, Clock, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function Header() {
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <h1 className="font-logo text-2xl font-bold tracking-[0.2em] uppercase">
            JUDGEGPT
          </h1>
        </div>
        <nav className="flex gap-1">
          <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/history")}>History</Button>
          <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/leaderboard")}>Leaderboard</Button>
        </nav>
      </div>
    </header>
  );
}

function JudgePanel() {
  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <h2 className="font-logo text-2xl font-bold tracking-wider mb-2">THE JUDGE PANEL</h2>
        <p className="text-muted-foreground">5 AI experts evaluate your hackathon project live</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {JUDGES.map((judge) => (
          <div key={judge.type} className="group text-center space-y-3">
            <div className="relative mx-auto w-20 h-20">
              <Avatar className="w-20 h-20 border-2 border-border group-hover:border-foreground transition-colors">
                <AvatarFallback className="text-lg font-logo bg-secondary text-foreground">{judge.initials}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${judge.bgClass} border-2 border-background`} />
            </div>
            <div>
              <p className="font-semibold text-sm">{judge.name}</p>
              <p className={`text-xs ${judge.textClass} font-medium`}>{judge.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentProjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState<{project: Project; report: FinalReport | null}[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: projects } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(6);
      if (!projects || projects.length === 0) return;
      const { data: reports } = await supabase.from("final_reports").select("*");
      const list = (projects as unknown as Project[]).map(p => ({
        project: p,
        report: (reports as unknown as FinalReport[] || []).find(r => r.project_id === p.id) || null,
      }));
      setItems(list);
    };
    load();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-logo text-xl font-bold tracking-wider">RECENT SUBMISSIONS</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="font-logo text-xs tracking-wider">
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ project, report }) => (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:border-foreground/30 transition-all group"
            onClick={() => navigate(report ? `/report/${project.id}` : `/evaluate/${project.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-foreground">{project.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{project.track}</Badge>
                </div>
                {report && (
                  <span className={`text-2xl font-logo font-bold ${Number(report.overall_score) >= 8 ? "text-success" : Number(report.overall_score) >= 6 ? "text-warning" : "text-destructive"}`}>
                    {Number(report.overall_score).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(project.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SubmissionForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    architecture: "",
    demo_transcript: "",
    track: "" as Track | "",
    presentation_url: "",
    website_url: "",
    video_url: "",
  });

  const fillExample = () => {
    setForm(f => ({
      ...f,
      name: EXAMPLE_PROJECT.name,
      description: EXAMPLE_PROJECT.description,
      architecture: EXAMPLE_PROJECT.architecture,
      demo_transcript: EXAMPLE_PROJECT.demo_transcript,
      track: EXAMPLE_PROJECT.track,
    }));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("project-videos").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("project-videos").getPublicUrl(path);
      setForm(f => ({ ...f, video_url: publicUrl }));
      toast({ title: "Video uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.architecture || !form.track) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: form.name,
          description: form.description,
          architecture: form.architecture,
          demo_transcript: form.demo_transcript || null,
          track: form.track as Track,
          presentation_url: form.presentation_url || null,
          website_url: form.website_url || null,
          video_url: form.video_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/evaluate/${data.id}`);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12" id="submit">
      <Card className="border-2 border-foreground/10 glow-border">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-logo text-xl tracking-wider">SUBMIT PROJECT</CardTitle>
              <CardDescription className="mt-1">Tell us about what you built</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fillExample} type="button" className="font-logo text-[10px] tracking-wider">
              <Eye className="mr-1 h-3 w-3" /> EXAMPLE
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">Project Name *</Label>
                <Input id="name" placeholder="e.g. CodeReview AI" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track" className="text-xs font-semibold uppercase tracking-wider">Track *</Label>
                <Select value={form.track} onValueChange={(v: Track) => setForm(f => ({ ...f, track: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select a track" /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider">Description *</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{form.description.length}/500</span>
              </div>
              <Textarea id="description" placeholder="What does your project do?" maxLength={500} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="architecture" className="text-xs font-semibold uppercase tracking-wider">Architecture *</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{form.architecture.length}/1000</span>
              </div>
              <Textarea id="architecture" placeholder="Tech stack, architecture patterns, agent design..." maxLength={1000} rows={4} value={form.architecture} onChange={e => setForm(f => ({ ...f, architecture: e.target.value }))} className="bg-background" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="demo" className="text-xs font-semibold uppercase tracking-wider">Demo Transcript</Label>
                <Badge variant="secondary" className="text-[10px]">Optional</Badge>
              </div>
              <Textarea id="demo" placeholder="Describe your demo, key moments, metrics..." rows={2} value={form.demo_transcript} onChange={e => setForm(f => ({ ...f, demo_transcript: e.target.value }))} className="bg-background" />
            </div>

            {/* New fields: URLs and video */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Presentation className="h-3 w-3" /> Presentation URL
                </Label>
                <Input placeholder="https://slides.google.com/..." value={form.presentation_url} onChange={e => setForm(f => ({ ...f, presentation_url: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Website URL
                </Label>
                <Input placeholder="https://your-project.com" value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <FileVideo className="h-3 w-3" /> Demo Video
              </Label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-4 cursor-pointer hover:border-foreground/30 transition-colors bg-background">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : form.video_url ? "Video uploaded ✓" : "Upload video (max 20MB)"}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full font-logo tracking-wider" size="lg" disabled={loading}>
              {loading ? "SUBMITTING..." : <><Send className="mr-2 h-4 w-4" /> SUBMIT FOR EVALUATION</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-background grid-bg relative">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none scanline opacity-30 z-10" />
      
      <Header />

      <main className="container mx-auto max-w-5xl px-4 relative z-20">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="inline-block mb-4">
            <Badge variant="outline" className="font-logo text-[10px] tracking-[0.3em] border-foreground/20 px-4 py-1">
              AI-POWERED HACKATHON JUDGING
            </Badge>
          </div>
          <h1 className="font-logo text-5xl md:text-7xl font-black tracking-[0.15em] mb-4">
            JUDGEGPT
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            5 specialized AI judges evaluate your hackathon project with live voice debates, detailed scoring, and actionable feedback.
          </p>
          <Button size="lg" className="font-logo tracking-wider" onClick={() => document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' })}>
            SUBMIT YOUR PROJECT <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>

        <JudgePanel />
        <RecentProjects />
        <SubmissionForm />

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-12 text-center">
          <p className="font-logo text-xs tracking-[0.3em] text-muted-foreground">JUDGEGPT — AI HACKATHON EVALUATION</p>
        </footer>
      </main>
    </div>
  );
}
