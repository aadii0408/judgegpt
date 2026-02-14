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
import { TRACKS, EXAMPLE_PROJECT, type Track } from "@/lib/judges";
import { Zap, Eye, Send } from "lucide-react";

export default function SubmissionForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    architecture: "",
    demo_transcript: "",
    track: "" as Track | "",
  });

  const fillExample = () => {
    setForm({
      name: EXAMPLE_PROJECT.name,
      description: EXAMPLE_PROJECT.description,
      architecture: EXAMPLE_PROJECT.architecture,
      demo_transcript: EXAMPLE_PROJECT.demo_transcript,
      track: EXAMPLE_PROJECT.track,
    });
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">JudgeGPT</h1>
          </div>
          <nav className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>History</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")}>Leaderboard</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Submit Your Project</h2>
          <p className="mt-2 text-muted-foreground">5 AI judges will evaluate your hackathon submission in real-time</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Tell us about what you built</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fillExample} type="button">
                <Eye className="mr-1 h-4 w-4" /> View Example
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" placeholder="e.g. CodeReview AI" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="track">Track *</Label>
                <Select value={form.track} onValueChange={(v: Track) => setForm(f => ({ ...f, track: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description *</Label>
                  <span className="text-xs text-muted-foreground">{form.description.length}/500</span>
                </div>
                <Textarea
                  id="description"
                  placeholder="What does your project do?"
                  maxLength={500}
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="architecture">Architecture Details *</Label>
                  <span className="text-xs text-muted-foreground">{form.architecture.length}/1000</span>
                </div>
                <Textarea
                  id="architecture"
                  placeholder="Tech stack, architecture patterns, agent design..."
                  maxLength={1000}
                  rows={5}
                  value={form.architecture}
                  onChange={e => setForm(f => ({ ...f, architecture: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="demo">Demo Transcript / Notes</Label>
                  <Badge variant="secondary">Optional</Badge>
                </div>
                <Textarea
                  id="demo"
                  placeholder="Describe your demo, key moments, metrics..."
                  rows={3}
                  value={form.demo_transcript}
                  onChange={e => setForm(f => ({ ...f, demo_transcript: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Submitting..." : <><Send className="mr-2 h-4 w-4" /> Submit for Evaluation</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
