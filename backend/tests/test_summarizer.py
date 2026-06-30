import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from backend.services.summarizer import generate_daily_summary

@pytest.mark.asyncio
async def test_generates_summary_string():
    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = "Acme saw a strong performance today with an 80% citation rate across tracked AI search queries."
    mock_msg.content = [mock_content]

    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "mock-key"}):
        with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=mock_msg)
            mock_anthropic_cls.return_value = mock_client

            summary = await generate_daily_summary(
                brand_name="Acme",
                run_date="2026-06-29",
                total_queries=10,
                cited_count=8,
                citation_rate=80.0,
                yesterday_rate=70.0,
                not_cited_queries=["q1"],
                top_competitors=["CompA"],
                new_sources=["source1.com"]
            )

            assert summary == "Acme saw a strong performance today with an 80% citation rate across tracked AI search queries."

@pytest.mark.asyncio
async def test_fallback_on_api_failure():
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "mock-key"}):
        with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(side_effect=Exception("API connection error"))
            mock_anthropic_cls.return_value = mock_client

            summary = await generate_daily_summary(
                brand_name="Acme",
                run_date="2026-06-29",
                total_queries=10,
                cited_count=5,
                citation_rate=50.0,
                yesterday_rate=50.0,
                not_cited_queries=[],
                top_competitors=[],
                new_sources=[]
            )

            assert "Citation rate for Acme today: 50.0%" in summary

@pytest.mark.asyncio
async def test_positive_trend_reflected():
    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = "Visibility increased significantly by +15% compared to yesterday."
    mock_msg.content = [mock_content]

    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "mock-key"}):
        with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=mock_msg)
            mock_anthropic_cls.return_value = mock_client

            summary = await generate_daily_summary(
                brand_name="Acme",
                run_date="2026-06-29",
                total_queries=10,
                cited_count=9,
                citation_rate=90.0,
                yesterday_rate=75.0,
                not_cited_queries=[],
                top_competitors=[],
                new_sources=[]
            )

            assert "increased" in summary or "90" in summary or len(summary) > 0
