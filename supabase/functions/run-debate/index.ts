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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const sorted = [...evaluations].sort((a: any, b: any) => b.score - a.score);
    const highJudge = sorted[0];
    const lowJudge = sorted[sorted.length - 1];

    if (highJudge.score - lowJudge.score < 3) {
      return new Response(JSON.stringify({ debate: null, reason: "Score gap too small for debate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Simulate a professional debate between two hackathon judges who strongly disagree about a project.

PROJECT: "${project.name}" — ${project.description}

JUDGE 1 (POSITIVE): ${highJudge.judge_name} (${highJudge.judge_type}) scored ${highJudge.score}/10
Reasoning: ${highJudge.reasoning}
Strengths cited: ${highJudge.strengths.join(", ")}

JUDGE 2 (CRITICAL): ${lowJudge.judge_name} (${lowJudge.judge_type}) scored ${lowJudge.score}/10
Reasoning: ${lowJudge.reasoning}
Weaknesses cited: ${lowJudge.weaknesses.join(", ")}

Write a 4-6 exchange debate dialogue. Each line should be attributed. Format:
${highJudge.judge_name}: <their argument>
${lowJudge.judge_name}: <their rebuttal>
...

Keep it professional but passionate. Each judge should defend their position with specific points.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const debate = data.content[0].text;

    return new Response(JSON.stringify({
      debate,
      highJudge: { name: highJudge.judge_name, type: highJudge.judge_type, score: highJudge.score },
      lowJudge: { name: lowJudge.judge_name, type: lowJudge.judge_type, score: lowJudge.score },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
