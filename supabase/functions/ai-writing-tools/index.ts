import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ToolType = 
  | 'proofread'
  | 'rewrite'
  | 'paraphrase'
  | 'humanize'
  | 'detect-ai'
  | 'fact-check'
  | 'find-citations'
  | 'grade'
  | 'reader-reactions'
  | 'chat';

const systemPrompts: Record<ToolType, string> = {
  proofread: `You are an expert proofreader and grammar checker. Analyze the given text for:
- Grammar errors
- Spelling mistakes
- Punctuation issues
- Style improvements
- Clarity enhancements

Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "type": "grammar" | "spelling" | "punctuation" | "style" | "clarity",
      "original": "the original text fragment",
      "replacement": "the suggested replacement",
      "message": "explanation of the issue",
      "startIndex": number,
      "endIndex": number
    }
  ],
  "overallScore": number (0-100),
  "summary": "brief summary of the text quality"
}

Be thorough and catch all issues. The score should reflect the actual quality - texts with many errors should score low.`,

  rewrite: `You are an expert writer. Rewrite the given text to improve its quality while maintaining the original meaning.
Focus on:
- Better word choice
- Improved flow
- Enhanced clarity
- Stronger impact

Return a JSON object:
{
  "rewritten": "the improved text",
  "changes": ["list of key changes made"],
  "improvementScore": number (percentage improvement estimate)
}`,

  paraphrase: `You are a paraphrasing expert. Rewrite the text in a completely different way while preserving the meaning.
Provide 3 different paraphrased versions with different tones.

Return a JSON object:
{
  "versions": [
    {
      "text": "paraphrased version",
      "tone": "formal/casual/academic/creative",
      "description": "brief description of this version"
    }
  ]
}`,

  humanize: `You are an expert at making AI-generated text sound more human and natural.
Transform the text to:
- Add natural variations
- Include conversational elements
- Reduce robotic patterns
- Add personality and warmth

Return a JSON object:
{
  "humanized": "the humanized text",
  "changesApplied": ["list of humanization techniques applied"],
  "humanScore": number (0-100, how human it now sounds)
}`,

  'detect-ai': `You are an AI content detector. Analyze the text for signs of AI generation.
Look for:
- Repetitive patterns
- Overly formal structure
- Lack of personal voice
- Generic phrasing
- Perfect grammar (ironically)
- Predictable sentence structures

Return a JSON object:
{
  "aiProbability": number (0-100),
  "humanProbability": number (0-100),
  "indicators": [
    {
      "type": "ai" | "human",
      "description": "what was detected",
      "evidence": "example from the text"
    }
  ],
  "verdict": "Likely AI" | "Likely Human" | "Mixed/Uncertain",
  "explanation": "detailed explanation of the analysis"
}`,

  'fact-check': `You are a fact-checker. Analyze claims in the text and verify their accuracy.

Return a JSON object:
{
  "claims": [
    {
      "claim": "the specific claim made",
      "verdict": "True" | "False" | "Partially True" | "Unverifiable" | "Needs Context",
      "explanation": "why this verdict was reached",
      "confidence": number (0-100)
    }
  ],
  "overallCredibility": number (0-100),
  "summary": "overall assessment of factual accuracy"
}`,

  'find-citations': `You are a citation finder. Identify claims that need citations and suggest potential sources.

Return a JSON object:
{
  "citationsNeeded": [
    {
      "text": "the text that needs a citation",
      "reason": "why a citation is needed",
      "suggestedSources": ["type of sources that could support this"],
      "searchQuery": "suggested search query to find sources"
    }
  ],
  "citationScore": number (0-100, how well-cited the text currently is),
  "recommendations": ["general recommendations for improving citations"]
}`,

  grade: `You are an academic grader. Evaluate the text based on writing quality criteria.

Return a JSON object:
{
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "numericScore": number (0-100),
  "criteria": {
    "clarity": { "score": number, "feedback": "string" },
    "organization": { "score": number, "feedback": "string" },
    "grammar": { "score": number, "feedback": "string" },
    "vocabulary": { "score": number, "feedback": "string" },
    "argumentation": { "score": number, "feedback": "string" },
    "originality": { "score": number, "feedback": "string" }
  },
  "strengths": ["list of strengths"],
  "improvements": ["list of areas to improve"],
  "detailedFeedback": "comprehensive feedback paragraph"
}`,

  'reader-reactions': `You are an audience analysis expert. Predict how readers might react to this text.

Return a JSON object:
{
  "reactions": [
    {
      "emoji": "appropriate emoji",
      "reaction": "reaction name (e.g., 'Engaged', 'Confused', 'Inspired')",
      "percentage": number (estimated % of readers who would feel this),
      "explanation": "why readers might react this way"
    }
  ],
  "engagement": {
    "score": number (0-100),
    "factors": ["what drives engagement"]
  },
  "sentiment": {
    "overall": "positive" | "negative" | "neutral",
    "breakdown": {
      "positive": number,
      "negative": number,
      "neutral": number
    }
  },
  "recommendations": ["how to improve reader reception"]
}`,

  chat: `You are a helpful writing assistant. Help the user with their writing questions and provide actionable advice.
Be conversational, helpful, and specific. Reference their text when relevant.
Always provide practical suggestions they can implement immediately.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, text, message, conversationHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = systemPrompts[tool as ToolType];
    if (!systemPrompt) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    let messages: Array<{ role: string; content: string }> = [];

    if (tool === 'chat') {
      messages = [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []),
        { role: "user", content: text ? `Context text:\n"""${text}"""\n\nUser question: ${message}` : message }
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: tool === 'chat' ? 0.7 : 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // For chat, return the raw response
    if (tool === 'chat') {
      return new Response(JSON.stringify({ response: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For other tools, try to parse JSON from the response
    let result;
    try {
      // Try to extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      result = { raw: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in ai-writing-tools function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
