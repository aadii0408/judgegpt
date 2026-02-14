import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { JUDGES, type Evaluation, type Project } from "@/lib/judges";
import { Swords, Loader2 } from "lucide-react";

interface DebateMessage {
  speaker: string;
  type: string;
  message: string;
  final_score?: number;
}

interface LiveDebateProps {
  evaluations: Evaluation[];
  project: Project;
  onConsensus?: (score: number, message: string) => void;
}

export default function LiveDebate({ evaluations, project, onConsensus }: LiveDebateProps) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamBuffer]);

  const getJudgeInfo = (name: string) => {
    return JUDGES.find(j => name.toLowerCase().includes(j.name.split(" ")[0].toLowerCase()));
  };

  const startDebate = async () => {
    setStarted(true);
    setIsStreaming(true);
    setMessages([]);
    setStreamBuffer("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-debate`,
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

      if (!resp.ok || !resp.body) throw new Error("Debate stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setStreamBuffer(fullText);

              // Try to parse complete JSONL lines from accumulated text
              const lines = fullText.split("\n");
              const parsedMessages: DebateMessage[] = [];
              let remainder = "";

              for (const l of lines) {
                const trimmed = l.trim();
                if (!trimmed) continue;
                // Strip markdown code fences
                if (trimmed.startsWith("```")) continue;
                try {
                  const msg = JSON.parse(trimmed);
                  if (msg.speaker && msg.message) {
                    parsedMessages.push(msg);
                  }
                } catch {
                  remainder = trimmed;
                }
              }

              if (parsedMessages.length > 0) {
                setMessages(parsedMessages);
                const last = parsedMessages[parsedMessages.length - 1];
                if (last.type === "final" && last.final_score && onConsensus) {
                  onConsensus(last.final_score, last.message);
                }
              }
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error("Debate error:", err);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!started) {
    return (
      <Card className="border-2 border-dashed border-foreground/20 glow-border">
        <CardContent className="py-12 text-center space-y-4">
          <Swords className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-logo text-lg tracking-wider font-bold">LIVE JUDGE DEBATE</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            All judges will debate your project live, challenge each other's reasoning, and reach a consensus score.
          </p>
          <Button size="lg" onClick={startDebate} className="font-logo tracking-wider">
            <Swords className="mr-2 h-4 w-4" /> START LIVE DEBATE
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-foreground/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-logo text-sm tracking-wider flex items-center gap-2">
            <Swords className="h-4 w-4" /> LIVE DEBATE
          </CardTitle>
          {isStreaming && (
            <Badge variant="outline" className="animate-pulse text-[10px] border-destructive text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive mr-1.5 inline-block animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {messages.map((msg, i) => {
            const judge = getJudgeInfo(msg.speaker);
            const isConsensus = msg.type === "final";

            if (isConsensus) {
              return (
                <div key={i} className="p-4 rounded-lg bg-primary/10 border-2 border-primary text-center space-y-2 animate-fade-in-up">
                  <p className="font-logo text-xs tracking-wider text-muted-foreground">CONSENSUS REACHED</p>
                  {msg.final_score && (
                    <p className="text-4xl font-logo font-black text-primary">{msg.final_score}</p>
                  )}
                  <p className="text-sm text-foreground">{msg.message}</p>
                </div>
              );
            }

            return (
              <div key={i} className={`flex gap-3 animate-fade-in-up`} style={{ animationDelay: `${i * 50}ms` }}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`text-[10px] font-logo ${judge?.bgClass || "bg-secondary"} text-white`}>
                    {judge?.initials || msg.speaker.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 p-3 rounded-lg border ${judge ? `border-l-2 ${judge.borderClass}` : "border-border"} bg-card`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${judge?.textClass || "text-foreground"}`}>{msg.speaker}</span>
                    <span className="text-[10px] text-muted-foreground">({msg.type})</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{msg.message}</p>
                </div>
              </div>
            );
          })}
          {isStreaming && messages.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-logo tracking-wider">Judges are preparing...</span>
            </div>
          )}
          {isStreaming && messages.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">judges are deliberating...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
