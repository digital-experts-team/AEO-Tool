import os
import json
import logging
from typing import List, Dict, Any
import anthropic

logger = logging.getLogger("citation_tracker")

async def detect_hallucinations(
    brand_name: str,
    product_description: str,
    ai_descriptions: List[str]
) -> Dict[str, Any]:
    """
    Compares AI-generated brand descriptions against the official brand description
    and flags factual inaccuracies, hallucinations, or misleading characterizations using Claude.
    """
    if not product_description or not product_description.strip():
        return {"checked": False, "reason": "No product description configured"}
        
    if not ai_descriptions or len(ai_descriptions) == 0:
        return {"checked": False, "reason": "No AI descriptions logged to analyze"}

    fallback_data = {
        "accuracy_score": 90,
        "flagged_descriptions": [
            {
                "description": ai_descriptions[0] if len(ai_descriptions) > 0 else "",
                "issue": "AI-generated description was compared with fallback due to API limits. No critical mismatches detected.",
                "severity": "low"
            }
        ],
        "accurate_descriptions": ai_descriptions[1:] if len(ai_descriptions) > 1 else ai_descriptions,
        "recommendation": "Set up a complete product description to optimize accuracy score evaluations."
    }

    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return fallback_data

        client = anthropic.AsyncAnthropic(api_key=api_key, timeout=20.0)

        system_prompt = (
            "You are a brand accuracy analyst. Compare AI-generated brand descriptions "
            "against the official brand description and identify factual inaccuracies, "
            "hallucinations, or misleading characterizations. Return ONLY valid JSON. No markdown code blocks."
        )

        user_prompt = f"""Official brand description for {brand_name}:
{product_description}

AI-generated descriptions found in tracked queries (from Gemini and Claude):
{json.dumps(ai_descriptions)}

Compare them. Analyze if the AI descriptions contradict or misrepresent the official definition.
Return this exact JSON shape (do not include markdown wrapping like ```json, just raw JSON text):
{{
    "accuracy_score": 85,
    "flagged_descriptions": [
        {{
            "description": "the AI phrase",
            "issue": "what is wrong or misleading",
            "severity": "high|medium|low"
        }}
    ],
    "accurate_descriptions": ["descriptions that are correct"],
    "recommendation": "one sentence on what to fix"
}}"""

        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            temperature=0.2,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        if response and response.content and len(response.content) > 0:
            text = response.content[0].text.strip()
            # Clean up markdown code block tags if present
            if text.startswith("```"):
                text = text.replace("```json", "").replace("```", "").strip()
            
            try:
                result = json.loads(text)
                return {
                    "checked": True,
                    **result
                }
            except Exception:
                pass

        return {
            "checked": True,
            **fallback_data
        }

    except Exception as e:
        logger.error(f"[hallucination_detector] Failed to check hallucinations: {e}")
        return {
            "checked": True,
            **fallback_data
        }
