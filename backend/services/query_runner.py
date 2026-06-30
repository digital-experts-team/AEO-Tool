import os
import asyncio
import httpx
from typing import Optional, Dict
import anthropic

SYSTEM_PROMPT = (
    "Answer the question directly and comprehensively. "
    "Include specific product names, companies, or services when relevant."
)

async def query_perplexity(query: str) -> Optional[str]:
    """
    Calls Perplexity AI chat completions API using httpx AsyncClient.
    Returns raw response text, or None on failure.
    """
    try:
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            print("[query_runner] PERPLEXITY_API_KEY not found in environment.")
            return None

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "sonar-medium-online",
            "temperature": 0.1,
            "max_tokens": 800,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query}
            ]
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post("https://api.perplexity.ai/chat/completions", headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                text = data["choices"][0]["message"]["content"]
                return text
            else:
                print(f"[query_runner] Perplexity API error status {response.status_code}: {response.text}")
                return None
    except Exception as e:
        print(f"[query_runner] Exception during Perplexity query: {e}")
        return None

async def query_claude(query: str) -> Optional[str]:
    """
    Uses anthropic SDK to call Claude model.
    Returns raw response text, or None on failure.
    """
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("[query_runner] ANTHROPIC_API_KEY not found in environment.")
            return None

        client = anthropic.AsyncAnthropic(api_key=api_key, timeout=30.0)
        
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": query}
            ]
        )
        
        if response and response.content and len(response.content) > 0:
            return response.content[0].text
        
        return None
    except Exception as e:
        print(f"[query_runner] Exception during Claude query: {e}")
        return None

async def run_all_engines(query: str) -> Dict[str, Optional[str]]:
    """
    Runs both query_perplexity and query_claude concurrently using asyncio.gather.
    Returns dict {"perplexity": response_or_None, "claude": response_or_None}.
    Never fails — always returns the dictionary.
    """
    try:
        results = await asyncio.gather(
            query_perplexity(query),
            query_claude(query),
            return_exceptions=True
        )

        perplexity_res = results[0] if isinstance(results[0], str) else None
        claude_res = results[1] if isinstance(results[1], str) else None

        if isinstance(results[0], Exception):
            print(f"[query_runner] Perplexity gather exception: {results[0]}")
        if isinstance(results[1], Exception):
            print(f"[query_runner] Claude gather exception: {results[1]}")

        return {
            "perplexity": perplexity_res,
            "claude": claude_res
        }
    except Exception as e:
        print(f"[query_runner] Exception in run_all_engines: {e}")
        return {
            "perplexity": None,
            "claude": None
        }
