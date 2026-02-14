import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type Evaluation, type Project, type Judge } from "@/lib/judges";
import { Swords, Loader2, Volume2, VolumeX } from "lucide-react";

interface DebateMessage {
  speaker: string;
  type: string;
  message: string;
  final_score?: number;
}

interface LiveDebateProps {
  evaluations: Evaluation[];
  project: Project;
  judges: Judge[];
  onConsensus?: (score: number, message: string) => void;
}

export default function LiveDebate({ evaluations, project, judges, onConsensus }: LiveDebateProps) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const abortRef = useRef(false);
  const messagesRef = useRef<DebateMessage[]>([]);
  const spokenCountRef = useRef(0);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentSpeaker]);

  const getJudgeInfo = (name: string) => {
    return judges.find(j => name.toLowerCase().includes(j.name.split(" ")[0].toLowerCase()));
  };

  const speakMessage = useCallback(async (text: string, voiceId: string): Promise<void> => {
    if (abortRef.current) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );
      if (!response.ok || abortRef.current) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      return new Promise((resolve) => {
        audio.onended = () => { audioRef.current = null; resolve(); };
        audio.onerror = () => { audioRef.current = null; resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch {
      // silently fail TTS
    }
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const toggleMute = () => {
    if (!isMuted) stopAudio();
    setIsMuted(!isMuted);
  };

  // Sequential voice playback - processes one message at a time
  const processVoiceQueue = useCallback(async () => {
    if (isSpeakingRef.current || isMuted) return;
    isSpeakingRef.current = true;

    while (spokenCountRef.current < messagesRef.current.length) {
      if (abortRef.current || isMuted) break;
      const idx = spokenCountRef.current;
      const msg = messagesRef.current[idx];
      const judge = getJudgeInfo(msg.speaker);
      
      setCurrentSpeaker(msg.speaker);
      setSpeakingIndex(idx);
      
      if (judge && !isMuted) {
        await speakMessage(msg.message, judge.voiceId);
      }
      
      // Small pause between speakers for natural feel
      if (!abortRef.current) {
        await new Promise(r => setTimeout(r, 400));
      }
      
      spokenCountRef.current = idx + 1;
    }

    setCurrentSpeaker(null);
    setSpeakingIndex(-1);
    isSpeakingRef.current = false;
  }, [isMuted, speakMessage, judges]);

  // Trigger voice queue when new messages arrive
  useEffect(() => {
    if (messages.length > spokenCountRef.current && !isMuted && !isSpeakingRef.current) {
      processVoiceQueue();
    }
  }, [messages.length, isMuted, processVoiceQueue]);

  // Auto-start debate on mount
  useEffect(() => {
    startDebate();
    return () => { abortRef.current = true; stopAudio(); };
  }, []);

  const startDebate = async () => {
    setIsStreaming(true);
    setMessages([]);
    spokenCountRef.current = 0;
    abortRef.current = false;

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

              const lines = fullText.split("\n");
              const parsedMessages: DebateMessage[] = [];

              for (const l of lines) {
                const trimmed = l.trim();
                if (!trimmed || trimmed.startsWith("```")) continue;
                try {
                  const msg = JSON.parse(trimmed);
                  if (msg.speaker && msg.message) parsedMessages.push(msg);
                } catch { /* incomplete */ }
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

  const stopDebate = () => {
    abortRef.current = true;
    stopAudio();
    setCurrentSpeaker(null);
    setSpeakingIndex(-1);
    setIsMuted(true);
  };

  return (
    <Card className="border-2 border-foreground/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-logo text-sm tracking-wider flex items-center gap-2">
            <Swords className="h-4 w-4" /> LIVE VOICE DEBATE
          </CardTitle>
          <div className="flex items-center gap-2">
            {(isStreaming || currentSpeaker) && (
              <Button variant="destructive" size="sm" onClick={stopDebate} className="font-logo text-[10px] tracking-wider">
                STOP
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            {isStreaming && (
              <Badge variant="outline" className="animate-pulse text-[10px] border-destructive text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive mr-1.5 inline-block animate-pulse" />
                LIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {messages.map((msg, i) => {
            const judge = getJudgeInfo(msg.speaker);
            const isConsensus = msg.type === "final";
            const isSpeaking = currentSpeaker === msg.speaker && i === speakingIndex;

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
              <div key={i} className={`flex gap-3 animate-fade-in-up ${isSpeaking ? "ring-2 ring-primary/50 rounded-lg" : ""}`} style={{ animationDelay: `${i * 50}ms` }}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`text-[10px] font-logo ${judge?.bgClass || "bg-secondary"} text-white`}>
                    {judge?.initials || msg.speaker.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 p-3 rounded-lg border ${judge ? `border-l-2 ${judge.borderClass}` : "border-border"} bg-card`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${judge?.textClass || "text-foreground"}`}>{msg.speaker}</span>
                    {isSpeaking && <Volume2 className="h-3 w-3 animate-pulse text-primary" />}
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
