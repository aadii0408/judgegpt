import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evaluations, project } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sorted = [...evaluations].sort((a: any, b: any) => b.score - a.score);
    const judges = sorted.map((e: any) => `${e.judge_name} (${e.judge_type}): ${e.score}/10 — ${e.reasoning}`);

    const prompt = `You are simulating a LIVE multi-judge debate panel at a hackathon. All 5 judges are present and discussing the project.

PROJECT: "${project.name}" — ${project.description}

JUDGES AND THEIR SCORES:
${judges.join("\n")}

Simulate a live, heated but professional roundtable debate. Rules:
- Each judge speaks in character based on their expertise and score
- Judges challenge each other's reasoning with specific points
- They reference strengths and weaknesses from their evaluations  
- The debate should feel natural, like a real conversation with interruptions and agreements
- After 8-12 exchanges, judges must reach a CONSENSUS final score
- End with a final consensus statement that all judges agree on

Format EACH line as JSON on its own line (JSONL format):
{"speaker": "Judge Name", "type": "judge_type", "message": "What they say"}

The LAST line must be:
{"speaker": "CONSENSUS", "type": "final", "message": "Final agreed score: X.X/10 — brief consensus reason", "final_score": X.X}

Keep messages punchy (1-3 sentences each). Make it feel ALIVE.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const err = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${err}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
