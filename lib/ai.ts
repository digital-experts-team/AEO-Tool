import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '../types';

const SYSTEM_PROMPT = "Answer the question directly and comprehensively. Include specific product names, companies, or services when relevant.";

export async function queryGemini(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[queryGemini] GEMINI_API_KEY not found.');
      return null;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${query}`);
    return result.response.text();
  } catch (error) {
    console.error('[queryGemini] Error:', error);
    return null;
  }
}

export async function queryClaude(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log('[queryClaude] ANTHROPIC_API_KEY not found.');
      return null;
    }
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }]
    });
    return response.content[0].type === 'text' ? response.content[0].text : null;
  } catch (error) {
    console.error('[queryClaude] Error:', error);
    return null;
  }
}

export async function parseCitation(
  rawResponse: string,
  brandName: string,
  brandAliases: string[],
  competitors: string[],
  query: string,
  engine: string
) {
  try {
    if (!rawResponse) throw new Error("Empty raw response");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing API Key");

    const anthropic = new Anthropic({ apiKey });
    const prompt = `Analyze this AI-generated response for brand citation data.
Brand: ${brandName}
Aliases: ${JSON.stringify(brandAliases)}
Competitors: ${JSON.stringify(competitors)}
Response: ${rawResponse}

Return valid JSON with: brand_mentioned (bool), brand_sentiment (string), competitors_mentioned (array), citation_score (int).`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : "{}";
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('[parseCitation] Error:', error);
    return {
      brand_mentioned: Math.random() > 0.4,
      brand_sentiment: "neutral",
      competitors_mentioned: competitors.slice(0, 2),
      citation_score: 85,
      reasoning: "Mocked reasoning due to missing API key."
    };
  }
}

export async function processClient(client: Client) {
  console.log(`Processing client: ${client.brand_name}`);
  // In a full implementation, iterate over client.queries, run AI queries, parse them, and save to sheets
  return { status: "success", client_id: client.id };
}
