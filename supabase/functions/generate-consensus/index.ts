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

    const prompt = `You are the head judge synthesizing feedback from a panel of 5 judges who evaluated a hackathon project.

PROJECT: ${project.name} (${project.track})

JUDGE SCORES:
${evaluations.map((e: any) => `${e.judge_name} (${e.judge_type}): ${e.score}/10`).join("\n")}

DETAILED FEEDBACK:
${JSON.stringify(evaluations, null, 2)}

Generate a final consensus report. Respond ONLY with valid JSON (no markdown, no code fences):
{
  "overallScore": <weighted average as number with 1 decimal>,
  "consensusStrengths": ["<common strength across judges>", ...],
  "criticalWeaknesses": ["<common weakness>", ...],
  "improvements": ["<actionable improvement, prioritized>", ...],
  "verdict": "<2-3 sentence summary of the panel's consensus>"
}`;

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
    const text = data.content[0].text.replace(/```json\s?|```/g, "").trim();
    const report = JSON.parse(text);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
