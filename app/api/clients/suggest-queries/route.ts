import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { brand_name, brand_aliases, competitors } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[suggest-queries] GEMINI_API_KEY not found. Using fallback.');
      return NextResponse.json({ queries: getFallbackQueries(brand_name, competitors) });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI SEO strategist. Identify the most critical search prompts a potential buyer would type into an AI search engine when looking for solutions comparing: '${brand_name}'.
Brand Aliases: ${brand_aliases.join(', ')}
Competitors: ${competitors.join(', ')}

Generate exactly 6 distinct, realistic, high-impact search queries (2 Buying Intent, 2 Competitor Comparison, 2 Informational).
Return only a valid JSON array of strings containing the 6 queries. Do not include markdown code blocks.
Example output format:
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const queries = JSON.parse(text);
    return NextResponse.json({ queries });
  } catch (error: any) {
    console.error('[suggest-queries] Error:', error);
    return NextResponse.json({ queries: getFallbackQueries("Brand", []) });
  }
}

function getFallbackQueries(brandName: string, competitors: string[]) {
  const comp1 = competitors[0] || "competitors";
  const comp2 = competitors[1] || "alternatives";
  return [
    `best alternative to ${comp1} for scaling teams`,
    `top-rated ${brandName} features for enterprise`,
    `${brandName} vs ${comp1} comparison 2026`,
    `how does ${brandName} compare to ${comp2}`,
    `best software for workflow automation`,
    `is ${brandName} secure and compliant`
  ];
}
