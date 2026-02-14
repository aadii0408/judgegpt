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
import { TRACKS, JUDGES, EXAMPLE_PROJECT, type Track, type Project, type FinalReport } from "@/lib/judges";
import { Send, Eye, Globe, FileVideo, Upload, ArrowRight, Clock } from "lucide-react";
import EditableJudgePanel from "@/components/EditableJudgePanel";
import HowItWorks from "@/components/HowItWorks";

function Header() {
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <h1 className="font-logo text-2xl font-bold tracking-[0.2em] uppercase">JUDGEGPT</h1>
        </div>
        <nav className="flex gap-1">
          <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/history")}>History</Button>
          <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/leaderboard")}>Leaderboard</Button>
        </nav>
      </div>
    </header>
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
    name: "", description: "", architecture: "", demo_transcript: "",
    track: "" as Track | "", presentation_url: "", website_url: "", video_url: "",
    github_url: "", demo_link: "", screenshot_url: "",
  });

  const fillExample = () => {
    setForm(f => ({ ...f, name: EXAMPLE_PROJECT.name, description: EXAMPLE_PROJECT.description, architecture: EXAMPLE_PROJECT.architecture, demo_transcript: EXAMPLE_PROJECT.demo_transcript, track: EXAMPLE_PROJECT.track }));
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Max 10MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("project-videos").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("project-videos").getPublicUrl(path);
      setForm(f => ({ ...f, screenshot_url: publicUrl }));
      toast({ title: "Screenshot uploaded!" });
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.architecture || !form.track) { toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("projects").insert({
        name: form.name, description: form.description, architecture: form.architecture,
        demo_transcript: form.demo_transcript || null, track: form.track as Track,
        presentation_url: form.presentation_url || null, 
        website_url: form.website_url || null, 
        video_url: form.screenshot_url || null,
        github_link: form.github_url || null,
        demo_video_link: form.demo_link || null,
      }).select().single();
      if (error) throw error;
      navigate(`/evaluate/${data.id}`);
    } catch (err: any) { toast({ title: "Submission failed", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
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
            {/* Project Title */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">Project Title *</Label>
              <Input id="name" placeholder="Enter your project title" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
            </div>

            {/* Track */}
            <div className="space-y-2">
              <Label htmlFor="track" className="text-xs font-semibold uppercase tracking-wider">Track *</Label>
              <Select value={form.track} onValueChange={(v: Track) => setForm(f => ({ ...f, track: v }))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select a track" /></SelectTrigger>
                <SelectContent>{TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider">Description *</Label>
              <Textarea id="description" placeholder="Describe what your project does..." maxLength={500} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background" />
            </div>

            {/* Tech Stack */}
            <div className="space-y-2">
              <Label htmlFor="architecture" className="text-xs font-semibold uppercase tracking-wider">Tech Stack *</Label>
              <Textarea id="architecture" placeholder="e.g. React, Node.js, OpenAI API, Supabase..." maxLength={1000} rows={3} value={form.architecture} onChange={e => setForm(f => ({ ...f, architecture: e.target.value }))} className="bg-background" />
            </div>

            {/* Project Screenshot */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Upload className="h-3 w-3" /> Project Screenshot *</Label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-6 cursor-pointer hover:border-foreground/30 transition-colors bg-background">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : form.screenshot_url ? "Screenshot uploaded ✓" : "Upload Screenshot"}</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG up to 10MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} disabled={uploading} />
              </label>
            </div>

            {/* GitHub URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Globe className="h-3 w-3" /> GitHub URL</Label>
              <Input placeholder="https://github.com/your-repo" value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} className="bg-background" />
            </div>

            {/* Demo Link */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><FileVideo className="h-3 w-3" /> Demo Link (YouTube/Loom)</Label>
              <Input placeholder="https://youtube.com/watch?v=... or https://loom.com/..." value={form.demo_link} onChange={e => setForm(f => ({ ...f, demo_link: e.target.value }))} className="bg-background" />
            </div>

            {/* Tips */}
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs text-muted-foreground">• We strongly encourage a comprehensive <span className="font-semibold text-foreground">README.md</span> in your Github Repo</p>
              <p className="text-xs text-muted-foreground">• For the video link, we recommend <span className="font-semibold text-foreground">Loom</span> or <span className="font-semibold text-foreground">YouTube</span></p>
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
  const [customJudges, setCustomJudges] = useState(() => {
    const saved = localStorage.getItem("judgegpt-custom-judges");
    return saved ? JSON.parse(saved) : [...JUDGES];
  });

  const handleUpdateJudges = (judges: typeof JUDGES) => {
    setCustomJudges(judges);
    localStorage.setItem("judgegpt-custom-judges", JSON.stringify(judges));
  };

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <div className="fixed inset-0 pointer-events-none scanline opacity-30 z-10" />
      <Header />
      <main className="container mx-auto max-w-5xl px-4 relative z-20">
        <section className="py-20 text-center">
          <div className="inline-block mb-4">
            <Badge variant="outline" className="font-logo text-[10px] tracking-[0.3em] border-foreground/20 px-4 py-1">AI-POWERED HACKATHON JUDGING</Badge>
          </div>
          <h1 className="font-logo text-5xl md:text-7xl font-black tracking-[0.15em] mb-4">JUDGEGPT</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">5 specialized AI judges evaluate your hackathon project with live voice debates, detailed scoring, and actionable feedback.</p>
          <Button size="lg" className="font-logo tracking-wider" onClick={() => document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' })}>
            SUBMIT YOUR PROJECT <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>

        <EditableJudgePanel customJudges={customJudges} onUpdateJudges={handleUpdateJudges} />
        <HowItWorks />
        <RecentProjects />
        <SubmissionForm />

        <footer className="border-t border-border py-8 mt-12 text-center">
          <p className="font-logo text-xs tracking-[0.3em] text-muted-foreground">JUDGEGPT — AI HACKATHON EVALUATION</p>
        </footer>
      </main>
    </div>
  );
}
