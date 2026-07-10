export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { brand_name, brand_aliases, competitors, industry, domain } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[suggest-queries] GEMINI_API_KEY not found. Using fallback.');
      return NextResponse.json({ queries: getFallbackQueries(brand_name, competitors) });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash" });

    const prompt = `You are an expert AI SEO strategist and Prompt Engineer. 
I need you to generate the most critical search prompts a potential buyer would type into an AI search engine (like ChatGPT or Perplexity) when researching solutions in this specific space.

Brand Name: '${brand_name}'
Industry/Niche: '${industry || 'General'}'
Primary Domain: '${domain || 'Unknown'}'
Brand Aliases: ${brand_aliases.join(', ')}
Competitors: ${competitors.join(', ')}

Your task is to generate exactly 6 distinct, highly-personalized, realistic, and high-impact search queries. DO NOT output generic prompts. The prompts should reflect the actual industry and how users search for these specific types of services or products.
Include:
- 2 Buying Intent queries (e.g. searching for the best providers or software in this specific niche)
- 2 Competitor Comparison queries (e.g. comparing this brand directly with the listed competitors)
- 2 Informational/Long-tail queries (e.g. asking how to solve a specific problem in this industry using this brand's services)

Return ONLY a valid JSON array of strings containing the 6 queries. Do not include markdown code blocks.
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
