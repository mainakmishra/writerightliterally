import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SearchType = 'fact-check' | 'find-citations' | 'plagiarism-check';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, text, claims } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    let result;

    switch (type as SearchType) {
      case 'fact-check':
        result = await factCheck(text, claims, PERPLEXITY_API_KEY);
        break;
      case 'find-citations':
        result = await findCitations(text, PERPLEXITY_API_KEY);
        break;
      case 'plagiarism-check':
        result = await checkPlagiarism(text, PERPLEXITY_API_KEY);
        break;
      default:
        throw new Error(`Unknown search type: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in perplexity-search function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function factCheck(text: string, claims: string[] | undefined, apiKey: string) {
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

    if (!response.ok) {
      console.error("Perplexity API error:", response.status);
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
      }
    } catch (e) {
      verifiedClaims.push({
        claim,
        verdict: "Unverifiable",
        explanation: content.slice(0, 200) || "Could not verify this claim",
        confidence: 50,
        sources: citations.slice(0, 3)
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

async function findCitations(text: string, apiKey: string) {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Perplexity API error:", response.status, errorText);
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
        parsed.citationsNeeded = parsed.citationsNeeded.map((c: any, i: number) => ({
          ...c,
          foundSources: c.foundSources || citations.slice(i * 2, i * 2 + 2)
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse citations response:", e);
  }

  return {
    citationsNeeded: [],
    citationScore: 80,
    recommendations: ["Unable to analyze citations. Please try again."]
  };
}

async function checkPlagiarism(text: string, apiKey: string) {
  // Split text into sentences for checking
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const uniqueSentences = sentences.slice(0, 8); // Check up to 8 sentences
  
  const matches = [];
  let totalOriginalityScore = 0;
  
  for (const sentence of uniqueSentences) {
    if (sentence.trim().length < 20) continue; // Skip very short sentences
    
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

    if (!response.ok) continue;

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
      } else {
        totalOriginalityScore += 100;
      }
    } catch (e) {
      totalOriginalityScore += 100; // Assume original if can't parse
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
