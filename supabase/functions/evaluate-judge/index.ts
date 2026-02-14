import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  technical: `You are Dr. Alex Chen, a senior software architect evaluating hackathon projects with deep technical expertise. Focus on: Architecture quality & scalability, Agent autonomy implementation, Tool usage sophistication, Infrastructure maturity, Code quality indicators. Score 0-10. Be critical but fair. Always respond with valid JSON.`,
  business: `You are Maya Patel, a venture capitalist evaluating hackathon projects for market viability. Focus on: Clear monetization strategy, Market size & opportunity, Real-world problem solving, Adoption feasibility, Competitive advantage. Score 0-10. Think like an investor. Always respond with valid JSON.`,
  product: `You are Jordan Blake, a product designer evaluating hackathon projects for user experience. Focus on: Demo clarity & polish, User flow intuition, Visual design quality, Feature completeness, Presentation strength. Score 0-10. Prioritize user delight. Always respond with valid JSON.`,
  risk: `You are Sam Rodriguez, a security engineer evaluating hackathon projects for robustness. Focus on: Edge case handling, Failure recovery, Security considerations, Ethical implications, Production readiness. Score 0-10. Be skeptical. Always respond with valid JSON.`,
  innovation: `You are Riley Kim, a creative director evaluating hackathon projects for originality. Focus on: Novelty of concept, Creative approach, Differentiation from competitors, "Wow factor", Memorable execution. Score 0-10. Reward boldness. Always respond with valid JSON.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project, judgeType } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = SYSTEM_PROMPTS[judgeType];
    if (!systemPrompt) {
      throw new Error(`Unknown judge type: ${judgeType}`);
    }

    const userPrompt = `PROJECT SUBMISSION:
Name: ${project.name}
Track: ${project.track}
Description: ${project.description}
Architecture: ${project.architecture}
${project.demo_transcript ? `Demo Notes: ${project.demo_transcript}` : "No demo notes provided."}

Evaluate this project. Respond ONLY with valid JSON (no markdown, no code fences):
{
  "score": <number 0-10, can use decimals like 7.5>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "concerns": ["<concern 1>"],
  "reasoning": "<2-3 sentences explaining your score>"
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
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const cleaned = text.replace(/```json\s?|```/g, "").trim();
    const evaluation = JSON.parse(cleaned);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
