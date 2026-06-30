import os
import json
import logging
from typing import Optional, List
import anthropic

logger = logging.getLogger("citation_tracker")

SYSTEM_PROMPT = (
    "You are a concise AI visibility analyst. Write brief, clear daily "
    "summaries for clients. Write in second person. Be specific, never vague. "
    "Return plain text only — no bullet points, no markdown, no headers. "
    "Maximum 4 sentences."
)

USER_PROMPT_TEMPLATE = """Write a daily citation summary.

Brand: {brand_name}
Date: {run_date}
Total queries tracked: {total_queries}
Queries where brand appeared: {cited_count} ({citation_rate}%)
Yesterday's citation rate: {yesterday_rate}%
Change: {change:+.1f}%
Queries where brand was absent: {not_cited_queries}
Competitors cited most today: {top_competitors}
New sources referencing the brand: {new_sources}

Write 3-4 sentences: overall performance, change from yesterday, which competitors dominated, and one specific recommendation."""

async def generate_daily_summary(
    brand_name: str,
    run_date: str,
    total_queries: int,
    cited_count: int,
    citation_rate: float,
    yesterday_rate: float,
    not_cited_queries: List[str],
    top_competitors: List[str],
    new_sources: List[str]
) -> Optional[str]:
    """
    Calls Claude model to generate a brief 3-4 sentence plain text daily citation summary.
    Returns plain text summary string, or fallback string on failure.
    """
    fallback = f"Citation rate for {brand_name} today: {citation_rate}%. Data logged successfully."
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("[summarizer] ANTHROPIC_API_KEY missing from environment.")
            return fallback

        change_val = citation_rate - yesterday_rate

        formatted_user_prompt = USER_PROMPT_TEMPLATE.format(
            brand_name=brand_name,
            run_date=run_date,
            total_queries=total_queries,
            cited_count=cited_count,
            citation_rate=citation_rate,
            yesterday_rate=yesterday_rate,
            change=change_val,
            not_cited_queries=json.dumps(not_cited_queries),
            top_competitors=json.dumps(top_competitors),
            new_sources=json.dumps(new_sources)
        )

        client = anthropic.AsyncAnthropic(api_key=api_key, timeout=30.0)

        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            temperature=0.3,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": formatted_user_prompt}
            ]
        )

        if response and response.content and len(response.content) > 0:
            summary_text = response.content[0].text.strip()
            return summary_text

        return fallback
    except Exception as e:
        logger.error(f"[summarizer] Exception during generate_daily_summary: {e}")
        return fallback
