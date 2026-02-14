import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { type Evaluation, type Judge } from "@/lib/judges";
import { Volume2, VolumeX, ChevronDown, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface JudgeCardProps {
  evaluation: Evaluation | null;
  judge: Judge;
  isActive: boolean;
  isComplete: boolean;
  onPlayVoice?: (text: string, voiceId: string) => void;
  onStopVoice?: () => void;
  isPlayingVoice?: boolean;
  isThisPlaying?: boolean;
}

export default function JudgeCard({ evaluation, judge, isActive, isComplete, onPlayVoice, onStopVoice, isPlayingVoice, isThisPlaying }: JudgeCardProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showScore, setShowScore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (evaluation && isComplete) {
      const text = evaluation.reasoning;
      let i = 0;
      setDisplayedText("");
      intervalRef.current = setInterval(() => {
        i++;
        setDisplayedText(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(intervalRef.current!);
          setTimeout(() => setShowScore(true), 300);
        }
      }, 15);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [evaluation, isComplete]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-success";
    if (score >= 6) return "text-warning";
    return "text-destructive";
  };

  if (!isActive && !isComplete) {
    return (
      <Card className="opacity-40 border-border">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">{judge.initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{judge.name}</p>
            <p className="text-xs text-muted-foreground">{judge.role}</p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (isActive && !isComplete) {
    return (
      <Card className={`border-2 ${judge.borderClass} animate-pulse-glow`}>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`${judge.bgClass} text-white text-xs`}>{judge.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">{judge.name}</p>
            <p className={`text-xs ${judge.textClass}`}>{judge.role}</p>
          </div>
          <Loader2 className={`h-5 w-5 animate-spin ${judge.textClass}`} />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${judge.borderClass} animate-fade-in-up`}>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={`${judge.bgClass} text-white text-xs`}>{judge.initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{judge.name}</p>
          <p className={`text-xs ${judge.textClass}`}>{judge.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {evaluation && (
            <>
              {isThisPlaying ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onStopVoice}
                >
                  <VolumeX className="h-4 w-4 text-destructive animate-pulse" />
                </Button>
              ) : (
                onPlayVoice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPlayVoice(evaluation.reasoning, judge.voiceId)}
                    disabled={isPlayingVoice}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )
              )}
            </>
          )}
          {showScore && evaluation && (
            <div className={`text-2xl font-bold animate-score-reveal ${getScoreColor(evaluation.score)}`}>
              {evaluation.score}
            </div>
          )}
          <CheckCircle className="h-4 w-4 text-success" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground leading-relaxed">{displayedText}<span className="animate-pulse">|</span></p>

        {evaluation && showScore && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                Details <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {evaluation.strengths.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-success">Strengths:</span>
                  {evaluation.strengths.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-success/30 text-success">{s}</Badge>
                  ))}
                </div>
              )}
              {evaluation.weaknesses.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-warning">Weaknesses:</span>
                  {evaluation.weaknesses.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-warning/30 text-warning">{w}</Badge>
                  ))}
                </div>
              )}
              {evaluation.concerns.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-destructive">Concerns:</span>
                  {evaluation.concerns.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-destructive/30 text-destructive">{c}</Badge>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
