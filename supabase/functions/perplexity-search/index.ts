import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SearchType = 'fact-check' | 'find-citations' | 'plagiarism-check';

// Opik tracing helper
async function createOpikTrace(
  name: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
  spans: Array<{ name: string; type: string; input: Record<string, unknown>; output: Record<string, unknown>; startTime: number; endTime: number }> = []
) {
  const OPIK_API_KEY = Deno.env.get("OPIK_API_KEY");
  if (!OPIK_API_KEY) {
    console.log("OPIK_API_KEY not configured, skipping trace");
    return;
  }

  const traceId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // Create trace
    const tracePayload = {
      id: traceId,
      name,
      project_name: "ai-writing-assistant",
      start_time: now,
      end_time: now,
      input,
      output,
      metadata,
    };

    const traceResponse = await fetch("https://www.comet.com/opik/api/v1/private/traces", {
      method: "POST",
      headers: {
        "Authorization": OPIK_API_KEY,
        "Comet-Workspace": "mainak-mishra",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ traces: [tracePayload] }),
    });

    if (!traceResponse.ok) {
      const errorText = await traceResponse.text();
      console.error("Opik trace error:", traceResponse.status, errorText);
      return;
    }

    // Create spans if any
    if (spans.length > 0) {
      const spanPayloads = spans.map((span) => ({
        id: crypto.randomUUID(),
        trace_id: traceId,
        name: span.name,
        type: span.type,
        start_time: new Date(span.startTime).toISOString(),
        end_time: new Date(span.endTime).toISOString(),
        input: span.input,
        output: span.output,
      }));

      await fetch("https://www.comet.com/opik/api/v1/private/spans", {
        method: "POST",
        headers: {
          "Authorization": OPIK_API_KEY,
          "Comet-Workspace": "mainak-mishra",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spans: spanPayloads }),
      });
    }

    console.log(`Opik trace created: ${traceId}`);
  } catch (error) {
    console.error("Error creating Opik trace:", error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  const spans: Array<{ name: string; type: string; input: Record<string, unknown>; output: Record<string, unknown>; startTime: number; endTime: number }> = [];

  try {
    const { type, text, claims } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    let result;

    switch (type as SearchType) {
      case 'fact-check':
        result = await factCheck(text, claims, PERPLEXITY_API_KEY, spans);
        break;
      case 'find-citations':
        result = await findCitations(text, PERPLEXITY_API_KEY, spans);
        break;
      case 'plagiarism-check':
        result = await checkPlagiarism(text, PERPLEXITY_API_KEY, spans);
        break;
      default:
        throw new Error(`Unknown search type: ${type}`);
    }

    // Log trace to Opik
    createOpikTrace(
      `perplexity-search/${type}`,
      {
        type,
        textLength: text?.length || 0,
        claimsCount: claims?.length,
      },
      {
        success: true,
        resultType: type,
        ...getSummaryOutput(type, result),
      },
      {
        model: "sonar",
        totalLatencyMs: Date.now() - requestStartTime,
        apiCallCount: spans.length,
      },
      spans
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in perplexity-search function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log error trace to Opik
    createOpikTrace(
      "perplexity-search/error",
      { error: message },
      { success: false, error: message },
      { latencyMs: Date.now() - requestStartTime },
      spans
    );

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getSummaryOutput(type: string, result: unknown): Record<string, unknown> {
  const r = result as Record<string, unknown>;
  switch (type) {
    case 'fact-check':
      return { claimsVerified: (r.claims as unknown[])?.length || 0, overallCredibility: r.overallCredibility };
    case 'find-citations':
      return { citationsNeeded: (r.citationsNeeded as unknown[])?.length || 0, citationScore: r.citationScore };
    case 'plagiarism-check':
      return { matchesFound: (r.matches as unknown[])?.length || 0, originalityScore: r.originalityScore };
    default:
      return {};
  }
}

async function factCheck(
  text: string, 
  claims: string[] | undefined, 
  apiKey: string,
  spans: Array<{ name: string; type: string; input: Record<string, unknown>; output: Record<string, unknown>; startTime: number; endTime: number }>
) {
  // Extract claims if not provided
  const claimsToCheck = claims || extractClaims(text);
  
  if (claimsToCheck.length === 0) {
    return {
      claims: [],
      overallCredibility: 100,
      summary: "No verifiable claims found in the text."
    };
  }

  const verifiedClaims = [];
  
  for (const claim of claimsToCheck.slice(0, 5)) { // Limit to 5 claims
    const spanStartTime = Date.now();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `You are a fact-checker. Verify the following claim using real-time web search. 
Return a JSON object with exactly these fields:
{
  "verdict": "True" | "False" | "Partially True" | "Unverifiable",
  "explanation": "brief explanation with evidence",
  "confidence": number (0-100)
}
Return ONLY the JSON, no other text.`
          },
          { role: 'user', content: `Verify this claim: "${claim}"` }
        ],
      }),
    });

    const spanEndTime = Date.now();

    if (!response.ok) {
      console.error("Perplexity API error:", response.status);
      spans.push({
        name: `fact_check_claim`,
        type: "llm",
        input: { claim: claim.slice(0, 100) },
        output: { error: `API error: ${response.status}` },
        startTime: spanStartTime,
        endTime: spanEndTime,
      });
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        verifiedClaims.push({
          claim,
          verdict: parsed.verdict || "Unverifiable",
          explanation: parsed.explanation || "Could not verify",
          confidence: parsed.confidence || 50,
          sources: citations.slice(0, 3)
        });

        spans.push({
          name: `fact_check_claim`,
          type: "llm",
          input: { claim: claim.slice(0, 100) },
          output: { verdict: parsed.verdict, confidence: parsed.confidence, sourcesCount: citations.length },
          startTime: spanStartTime,
          endTime: spanEndTime,
        });
      }
    } catch (e) {
      verifiedClaims.push({
        claim,
        verdict: "Unverifiable",
        explanation: content.slice(0, 200) || "Could not verify this claim",
        confidence: 50,
        sources: citations.slice(0, 3)
      });

      spans.push({
        name: `fact_check_claim`,
        type: "llm",
        input: { claim: claim.slice(0, 100) },
        output: { verdict: "Unverifiable", parseError: true },
        startTime: spanStartTime,
        endTime: spanEndTime,
      });
    }
  }

  const trueCount = verifiedClaims.filter(c => c.verdict === "True").length;
  const partialCount = verifiedClaims.filter(c => c.verdict === "Partially True").length;
  const overallCredibility = verifiedClaims.length > 0 
    ? Math.round(((trueCount + partialCount * 0.5) / verifiedClaims.length) * 100)
    : 100;

  return {
    claims: verifiedClaims,
    overallCredibility,
    summary: `Verified ${verifiedClaims.length} claims. ${trueCount} true, ${partialCount} partially true.`
  };
}

async function findCitations(
  text: string, 
  apiKey: string,
  spans: Array<{ name: string; type: string; input: Record<string, unknown>; output: Record<string, unknown>; startTime: number; endTime: number }>
) {
  const spanStartTime = Date.now();

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { 
          role: 'system', 
          content: `You are a citation finder. Analyze the text and identify statements that need citations.
For each statement needing a citation, search for relevant academic or authoritative sources.

Return a JSON object with exactly this structure:
{
  "citationsNeeded": [
    {
      "text": "the exact statement needing citation",
      "reason": "why this needs a citation",
      "suggestedSources": ["type of sources"],
      "searchQuery": "suggested search query",
      "foundSources": ["any relevant URLs found"]
    }
  ],
  "citationScore": number (0-100, how well-cited currently),
  "recommendations": ["improvement suggestions"]
}

If the text is a simple personal statement or greeting with no claims, return:
{
  "citationsNeeded": [],
  "citationScore": 100,
  "recommendations": ["No citations needed for personal statements"]
}

Return ONLY valid JSON, no other text.`
        },
        { role: 'user', content: `Find citations needed for this text:\n\n${text}` }
      ],
    }),
  });

  const spanEndTime = Date.now();

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Perplexity API error:", response.status, errorText);

    spans.push({
      name: "find_citations",
      type: "llm",
      input: { textLength: text.length },
      output: { error: `API error: ${response.status}` },
      startTime: spanStartTime,
      endTime: spanEndTime,
    });

    throw new Error("Failed to search for citations");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const citations = data.citations || [];
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Enhance with actual citations from Perplexity
      if (parsed.citationsNeeded) {
        parsed.citationsNeeded = parsed.citationsNeeded.map((c: Record<string, unknown>, i: number) => ({
          ...c,
          foundSources: c.foundSources || citations.slice(i * 2, i * 2 + 2)
        }));
      }

      spans.push({
        name: "find_citations",
        type: "llm",
        input: { textLength: text.length },
        output: { citationsNeeded: parsed.citationsNeeded?.length || 0, citationScore: parsed.citationScore },
        startTime: spanStartTime,
        endTime: spanEndTime,
      });

      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse citations response:", e);

    spans.push({
      name: "find_citations",
      type: "llm",
      input: { textLength: text.length },
      output: { parseError: true },
      startTime: spanStartTime,
      endTime: spanEndTime,
    });
  }

  return {
    citationsNeeded: [],
    citationScore: 80,
    recommendations: ["Unable to analyze citations. Please try again."]
  };
}

async function checkPlagiarism(
  text: string, 
  apiKey: string,
  spans: Array<{ name: string; type: string; input: Record<string, unknown>; output: Record<string, unknown>; startTime: number; endTime: number }>
) {
  // Split text into sentences for checking
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const uniqueSentences = sentences.slice(0, 8); // Check up to 8 sentences
  
  const matches = [];
  let totalOriginalityScore = 0;
  
  for (const sentence of uniqueSentences) {
    if (sentence.trim().length < 20) continue; // Skip very short sentences

    const spanStartTime = Date.now();
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `You are a plagiarism detector. Search for this exact phrase or very similar text online.
If you find matching or highly similar content, return:
{
  "isMatch": true,
  "similarity": number (0-100),
  "matchType": "exact" | "paraphrase" | "common_phrase",
  "explanation": "brief explanation"
}
If no matches found:
{
  "isMatch": false,
  "similarity": 0,
  "matchType": "original",
  "explanation": "No matching content found"
}
Return ONLY the JSON.`
          },
          { role: 'user', content: `Check for plagiarism: "${sentence.trim()}"` }
        ],
      }),
    });

    const spanEndTime = Date.now();

    if (!response.ok) {
      spans.push({
        name: "plagiarism_check_sentence",
        type: "llm",
        input: { sentenceLength: sentence.length },
        output: { error: `API error: ${response.status}` },
        startTime: spanStartTime,
        endTime: spanEndTime,
      });
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.isMatch && parsed.similarity > 30) {
          matches.push({
            text: sentence.trim(),
            similarity: parsed.similarity,
            matchType: parsed.matchType,
            explanation: parsed.explanation,
            sources: citations.slice(0, 2)
          });
        }
        totalOriginalityScore += (100 - (parsed.similarity || 0));

        spans.push({
          name: "plagiarism_check_sentence",
          type: "llm",
          input: { sentenceLength: sentence.length },
          output: { isMatch: parsed.isMatch, similarity: parsed.similarity, matchType: parsed.matchType },
          startTime: spanStartTime,
          endTime: spanEndTime,
        });
      } else {
        totalOriginalityScore += 100;

        spans.push({
          name: "plagiarism_check_sentence",
          type: "llm",
          input: { sentenceLength: sentence.length },
          output: { original: true },
          startTime: spanStartTime,
          endTime: spanEndTime,
        });
      }
    } catch (e) {
      totalOriginalityScore += 100; // Assume original if can't parse

      spans.push({
        name: "plagiarism_check_sentence",
        type: "llm",
        input: { sentenceLength: sentence.length },
        output: { parseError: true, assumedOriginal: true },
        startTime: spanStartTime,
        endTime: spanEndTime,
      });
    }
  }

  const checkedCount = uniqueSentences.filter(s => s.trim().length >= 20).length;
  const originalityScore = checkedCount > 0 
    ? Math.round(totalOriginalityScore / checkedCount) 
    : 100;

  return {
    originalityScore,
    matches,
    totalChecked: checkedCount,
    summary: matches.length > 0 
      ? `Found ${matches.length} potential matches. Review flagged sections.`
      : "No significant matches found. Content appears original."
  };
}

function extractClaims(text: string): string[] {
  // Simple claim extraction - sentences with factual indicators
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const factualIndicators = [
    /\d+%/, /\d+ (million|billion|thousand)/, /according to/i, /studies show/i,
    /research (indicates|shows|proves)/i, /\d{4}/, /statistics/i, /data shows/i,
    /is (the|a) (largest|smallest|first|only)/i, /was (founded|created|invented)/i
  ];
  
  return sentences
    .filter(s => factualIndicators.some(pattern => pattern.test(s)))
    .map(s => s.trim())
    .slice(0, 5);
}
