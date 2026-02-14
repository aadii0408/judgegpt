import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import type { Project, FinalReport } from "@/lib/judges";

interface HistoryItem {
  project: Project;
  report: FinalReport | null;
}

export default function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: projects } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (!projects) { setLoading(false); return; }
      const { data: reports } = await supabase.from("final_reports").select("*");
      const historyItems = (projects as unknown as Project[]).map(p => ({
        project: p,
        report: (reports as unknown as FinalReport[] || []).find(r => r.project_id === p.id) || null,
      }));
      setItems(historyItems);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="font-logo text-xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <nav className="flex gap-1">
            <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/")}>Submit</Button>
            <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/leaderboard")}>Leaderboard</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h2 className="font-logo text-3xl font-bold tracking-wider mb-6">HISTORY</h2>

        {loading ? (
          <div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING...</div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No evaluations yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {items.map(({ project, report }) => (
              <Card key={project.id} className="cursor-pointer hover:border-foreground/30 transition-colors" onClick={() => navigate(report ? `/report/${project.id}` : `/evaluate/${project.id}`)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{project.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{project.track}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {report && (
                      <span className={`text-2xl font-logo font-bold ${Number(report.overall_score) >= 8 ? "text-success" : Number(report.overall_score) >= 6 ? "text-warning" : "text-destructive"}`}>
                        {Number(report.overall_score).toFixed(1)}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
