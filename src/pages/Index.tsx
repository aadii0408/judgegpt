import { useState } from "react";
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
import { TRACKS, type Track } from "@/lib/types";
import { Send, Upload, CheckCircle, Globe, FileVideo } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", team_name: "", track: "" as Track | "",
    problem_statement: "", description: "", tech_stack_used: "",
    github_link: "", demo_video_link: "", website_url: "",
    pitch_deck_url: "", additional_notes: "",
  });

  const handlePitchDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast({ title: "File too large", description: "Max 20MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("pitch-decks").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("pitch-decks").getPublicUrl(path);
      setForm(f => ({ ...f, pitch_deck_url: publicUrl }));
      toast({ title: "Pitch deck uploaded!" });
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.team_name || !form.track || !form.problem_statement || !form.description || !form.tech_stack_used) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("projects").insert({
        name: form.name,
        team_name: form.team_name,
        track: form.track,
        problem_statement: form.problem_statement,
        description: form.description,
        tech_stack_used: form.tech_stack_used,
        github_link: form.github_link || null,
        demo_video_link: form.demo_video_link || null,
        website_url: form.website_url || null,
        pitch_deck_url: form.pitch_deck_url || null,
        additional_notes: form.additional_notes || null,
        status: "Submitted",
      }).select().single();
      if (error) throw error;

      // Generate AI summary in background
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ projectId: data.id, project: { ...form, track: form.track } }),
      }).catch(console.error);

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background grid-bg">
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <h1 className="font-logo text-2xl font-bold tracking-[0.2em] cursor-pointer" onClick={() => navigate("/")}>JUDGEGPT</h1>
          </div>
        </header>
        <main className="container mx-auto max-w-lg px-4 py-20 text-center space-y-6">
          <CheckCircle className="h-16 w-16 mx-auto text-success" />
          <h2 className="font-logo text-2xl tracking-wider font-bold">SUBMISSION RECEIVED</h2>
          <p className="text-muted-foreground">Your project has been submitted successfully. Our judges will review it shortly.</p>
          <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", team_name: "", track: "" as Track | "", problem_statement: "", description: "", tech_stack_used: "", github_link: "", demo_video_link: "", website_url: "", pitch_deck_url: "", additional_notes: "" }); }}>
            Submit Another Project
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-logo text-2xl font-bold tracking-[0.2em] cursor-pointer" onClick={() => navigate("/")}>JUDGEGPT</h1>
          <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/login")}>
            Judge Login
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <section className="py-8 text-center">
          <Badge variant="outline" className="font-logo text-[10px] tracking-[0.3em] border-foreground/20 px-4 py-1 mb-4">HACKATHON PROJECT SUBMISSION</Badge>
          <h1 className="font-logo text-4xl md:text-5xl font-black tracking-[0.15em] mb-3">JUDGEGPT</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Submit your hackathon project for evaluation by our expert judges.</p>
        </section>

        <Card className="border-2 border-foreground/10">
          <CardHeader>
            <CardTitle className="font-logo text-xl tracking-wider">SUBMIT PROJECT</CardTitle>
            <CardDescription>Fill in the details about your hackathon project</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Project Name *</Label>
                  <Input placeholder="e.g. CodeReview AI" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Team Name *</Label>
                  <Input placeholder="e.g. Team Alpha" value={form.team_name} onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Track / Category *</Label>
                <Select value={form.track} onValueChange={(v: Track) => setForm(f => ({ ...f, track: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                  <SelectContent>{TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Problem Statement *</Label>
                <Textarea placeholder="What problem are you solving?" rows={3} value={form.problem_statement} onChange={e => setForm(f => ({ ...f, problem_statement: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Solution Description *</Label>
                <Textarea placeholder="Describe your solution..." rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Tech Stack *</Label>
                <Input placeholder="e.g. React, Node.js, PostgreSQL, GPT-4" value={form.tech_stack_used} onChange={e => setForm(f => ({ ...f, tech_stack_used: e.target.value }))} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">GitHub Link</Label>
                  <Input type="url" placeholder="https://github.com/..." value={form.github_link} onChange={e => setForm(f => ({ ...f, github_link: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><FileVideo className="h-3 w-3" /> Demo Video Link</Label>
                  <Input type="url" placeholder="https://youtube.com/..." value={form.demo_video_link} onChange={e => setForm(f => ({ ...f, demo_video_link: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Globe className="h-3 w-3" /> Website Link</Label>
                <Input type="url" placeholder="https://your-project.com" value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Pitch Deck (file upload)</Label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-4 cursor-pointer hover:border-foreground/30 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : form.pitch_deck_url ? "Deck uploaded ✓" : "Upload pitch deck (max 20MB)"}</span>
                  <input type="file" accept=".pdf,.pptx,.ppt,.key" className="hidden" onChange={handlePitchDeckUpload} disabled={uploading} />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Additional Notes</Label>
                  <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                </div>
                <Textarea placeholder="Anything else you'd like judges to know..." rows={2} value={form.additional_notes} onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))} />
              </div>

              <Button type="submit" className="w-full font-logo tracking-wider" size="lg" disabled={loading}>
                {loading ? "SUBMITTING..." : <><Send className="mr-2 h-4 w-4" /> SUBMIT FOR EVALUATION</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <footer className="border-t border-border py-8 mt-12 text-center">
          <p className="font-logo text-xs tracking-[0.3em] text-muted-foreground">JUDGEGPT — HACKATHON JUDGING PLATFORM</p>
        </footer>
      </main>
    </div>
  );
}
