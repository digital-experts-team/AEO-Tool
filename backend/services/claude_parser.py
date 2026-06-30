import os
import json
import logging
from typing import Optional, List, Dict, Any
import anthropic

logger = logging.getLogger("citation_tracker")

SYSTEM_PROMPT = (
    "You are a precise brand citation analyst. You receive a raw AI-generated "
    "answer and extract structured citation data. You return ONLY valid JSON "
    "with no markdown, no explanation, no extra text. "
    "Distinguish carefully between two signals: "
    "brand_mentioned (the brand name appears anywhere in the response body as a recommendation or answer) "
    "and brand_cited_as_source (the brand's website URL appears as a source link or reference URL)."
)

USER_PROMPT_TEMPLATE = """Analyze this AI-generated response for brand citation data.

Client brand: {brand_name}
Brand aliases (also count as brand mentions): {brand_aliases}
Competitors to track: {competitors}
Original query: {query}
AI engine: {engine}

Response to analyze:
---
{raw_response}
---

Return ONLY this JSON, nothing else:
{{
  "brand_mentioned": true or false,
  "brand_cited_as_source": true or false,
  "brand_sentiment": "positive" or "neutral" or "negative" or "not_mentioned",
  "brand_description": "exact phrase describing the brand or null",
  "brand_position": "first" or "middle" or "last" or "only" or "not_mentioned",
  "competitors_mentioned": ["array of competitor names found"],
  "competitor_positions": {{"CompetitorName": "first/middle/last"}},
  "source_urls": ["any urls cited in the response"],
  "brand_source_urls": ["only the source urls that belong to the brand or its domains"],
  "citation_score": 1 if brand mentioned, 0 if not,
  "reasoning": "one sentence explaining the assessment"
}}"""

async def parse_citation(
    raw_response: str,
    brand_name: str,
    brand_aliases: List[str],
    competitors: List[str],
    query: str,
    engine: str
) -> Optional[Dict[str, Any]]:
    """
    Takes raw AI output and uses Claude sonnet model to extract structured citation metrics.
    Returns parsed dictionary or None on failure.
    """
    try:
        if not raw_response or not str(raw_response).strip():
            return None

        api_key = os.getenv("ANTHROPIC_API_KEY", "mock-api-key")

        formatted_user_prompt = USER_PROMPT_TEMPLATE.format(
            brand_name=brand_name,
            brand_aliases=json.dumps(brand_aliases),
            competitors=json.dumps(competitors),
            query=query,
            engine=engine,
            raw_response=raw_response
        )

        client = anthropic.AsyncAnthropic(api_key=api_key, timeout=30.0)

        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            temperature=0.0,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": formatted_user_prompt}
            ]
        )

        if not response or not response.content or len(response.content) == 0:
            logger.error("[claude_parser] Received empty response from Anthropic API.")
            return None

        raw_json_text = response.content[0].text.strip()

        # Strip markdown block quotes if present
        if raw_json_text.startswith("```json"):
            raw_json_text = raw_json_text[7:]
        elif raw_json_text.startswith("```"):
            raw_json_text = raw_json_text[3:]
        if raw_json_text.endswith("```"):
            raw_json_text = raw_json_text[:-3]
        raw_json_text = raw_json_text.strip()

        try:
            parsed_data = json.loads(raw_json_text)
            return parsed_data
        except json.JSONDecodeError as jde:
            logger.error(f"[claude_parser] JSON decode error: {jde}. Raw response text was:\n{raw_json_text}")
            return None

    except Exception as e:
        logger.error(f"[claude_parser] Exception in parse_citation: {e}")
        return None
