import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { TRACKS, type Project, type FinalReport } from "@/lib/judges";

interface LeaderboardEntry {
  project: Project;
  score: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: reports } = await supabase.from("final_reports").select("*");
      if (!reports || reports.length === 0) { setLoading(false); return; }
      const projectIds = (reports as unknown as FinalReport[]).map(r => r.project_id);
      const { data: projects } = await supabase.from("projects").select("*").in("id", projectIds);
      if (!projects) { setLoading(false); return; }
      const leaderboard = (reports as unknown as FinalReport[]).map(r => {
        const proj = (projects as unknown as Project[]).find(p => p.id === r.project_id);
        return proj ? { project: proj, score: Number(r.overall_score) } : null;
      }).filter(Boolean) as LeaderboardEntry[];
      leaderboard.sort((a, b) => b.score - a.score);
      setEntries(leaderboard);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? entries : entries.filter(e => e.project.track === filter);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="font-logo text-xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <nav className="flex gap-1">
            <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/")}>Submit</Button>
            <Button variant="ghost" size="sm" className="font-logo text-xs tracking-wider" onClick={() => navigate("/history")}>History</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-logo text-3xl font-bold tracking-wider flex items-center gap-2">
            <Trophy className="h-7 w-7 text-warning" /> LEADERBOARD
          </h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="animate-pulse text-muted-foreground font-logo tracking-wider">LOADING...</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No evaluated projects yet.</CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 font-logo text-[10px] tracking-wider">#</TableHead>
                  <TableHead className="font-logo text-[10px] tracking-wider">PROJECT</TableHead>
                  <TableHead className="font-logo text-[10px] tracking-wider">TRACK</TableHead>
                  <TableHead className="text-right font-logo text-[10px] tracking-wider">SCORE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry, i) => (
                  <TableRow key={entry.project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/report/${entry.project.id}`)}>
                    <TableCell className="font-logo font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{entry.project.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{entry.project.track}</Badge></TableCell>
                    <TableCell className={`text-right font-logo font-bold ${entry.score >= 8 ? "text-success" : entry.score >= 6 ? "text-warning" : "text-destructive"}`}>
                      {entry.score.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
}
