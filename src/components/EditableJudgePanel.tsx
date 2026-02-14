import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { JUDGES, type Judge } from "@/lib/judges";
import { Pencil, Check } from "lucide-react";

interface EditableJudgePanelProps {
  customJudges: Judge[];
  onUpdateJudges: (judges: Judge[]) => void;
}

export default function EditableJudgePanel({ customJudges, onUpdateJudges }: EditableJudgePanelProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  const openEdit = (i: number) => {
    setEditIndex(i);
    setEditName(customJudges[i].name);
    setEditRole(customJudges[i].role);
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const updated = [...customJudges];
    const initials = editName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    updated[editIndex] = { ...updated[editIndex], name: editName, role: editRole, initials };
    onUpdateJudges(updated);
    setEditIndex(null);
  };

  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <h2 className="font-logo text-2xl font-bold tracking-wider mb-2">THE JUDGE PANEL</h2>
        <p className="text-muted-foreground text-sm">5 AI experts evaluate your project — click to customize</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {customJudges.map((judge, i) => (
          <Dialog key={judge.type} open={editIndex === i} onOpenChange={(open) => { if (!open) setEditIndex(null); else openEdit(i); }}>
            <DialogTrigger asChild>
              <div className="group text-center space-y-3 cursor-pointer relative">
                <div className="relative mx-auto w-20 h-20">
                  <Avatar className="w-20 h-20 border-2 border-border group-hover:border-foreground transition-colors">
                    <AvatarFallback className="text-lg font-logo bg-secondary text-foreground">{judge.initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${judge.bgClass} border-2 border-background`} />
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                      <Pencil className="h-3 w-3 text-background" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm">{judge.name}</p>
                  <p className={`text-xs ${judge.textClass} font-medium`}>{judge.role}</p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-logo tracking-wider text-sm">EDIT JUDGE</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Judge name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Role</Label>
                  <Input value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="e.g. Technical Depth" />
                </div>
                <Button onClick={saveEdit} className="w-full font-logo tracking-wider text-xs">
                  <Check className="mr-1 h-3 w-3" /> SAVE CHANGES
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  );
}
