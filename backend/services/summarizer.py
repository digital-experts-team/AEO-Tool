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

Write 3-4 sentences: overall performance, which competitors dominated, and one specific recommendation. DO NOT restate the citation rate or mention rate percentages in your summary, as they are already displayed in the UI."""

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
    fallback = f"Tracked search queries for {brand_name} executed successfully across generative engines today."
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

async def generate_recommendations(brand_name: str, uncited_queries: List[str], top_competitors: List[str]) -> str:
    """
    Calls Claude to generate 3 actionable recommendations based on gap analysis.
    """
    fallback = "Focus on content generation for missed queries. Enhance PR efforts. Monitor competitor keyword strategy."
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return fallback

        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = f"Brand: {brand_name}\nQueries where brand was not cited: {uncited_queries}\nTop Competitors cited in these queries: {top_competitors}\n\nBased on this gap analysis, provide exactly 3 short, highly actionable SEO/PR recommendations to improve generative AI citation for {brand_name}. Format as a simple markdown list."

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=250,
            temperature=0.7,
            system="You are an expert AI SEO strategist.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
    except Exception as e:
        logger.error(f"[summarizer] Failed to generate recommendations: {e}")
        return fallback
