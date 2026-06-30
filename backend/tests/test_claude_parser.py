import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from backend.services.claude_parser import parse_citation

@pytest.mark.asyncio
async def test_brand_clearly_mentioned():
    mock_response_json = json.dumps({
        "brand_mentioned": True,
        "brand_sentiment": "positive",
        "brand_description": "leading citation tracker",
        "brand_position": "first",
        "competitors_mentioned": [],
        "source_urls": [],
        "citation_score": 1,
        "reasoning": "Brand clearly cited."
    })

    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = mock_response_json
    mock_msg.content = [mock_content]

    with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_anthropic_cls.return_value = mock_client

        result = await parse_citation(
            raw_response="Acme is the top tool for AI citation tracking.",
            brand_name="Acme",
            brand_aliases=["Acme"],
            competitors=["CompA"],
            query="best citation tool",
            engine="claude-sonnet-4-6"
        )

        assert result is not None
        assert isinstance(result, dict)
        assert result["brand_mentioned"] is True
        assert result["citation_score"] == 1

@pytest.mark.asyncio
async def test_brand_not_mentioned():
    mock_response_json = json.dumps({
        "brand_mentioned": False,
        "brand_sentiment": "not_mentioned",
        "brand_description": None,
        "brand_position": "not_mentioned",
        "competitors_mentioned": ["CompA"],
        "source_urls": [],
        "citation_score": 0,
        "reasoning": "Brand was not cited."
    })

    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = mock_response_json
    mock_msg.content = [mock_content]

    with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_anthropic_cls.return_value = mock_client

        result = await parse_citation(
            raw_response="Only CompA was mentioned in the results.",
            brand_name="Acme",
            brand_aliases=["Acme"],
            competitors=["CompA"],
            query="best citation tool",
            engine="claude-sonnet-4-6"
        )

        assert result is not None
        assert result["brand_mentioned"] is False
        assert result["citation_score"] == 0

@pytest.mark.asyncio
async def test_brand_alias_mentioned():
    mock_response_json = json.dumps({
        "brand_mentioned": True,
        "brand_sentiment": "neutral",
        "brand_description": "software company",
        "brand_position": "middle",
        "competitors_mentioned": [],
        "source_urls": [],
        "citation_score": 1,
        "reasoning": "Brand alias Acme was mentioned."
    })

    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = mock_response_json
    mock_msg.content = [mock_content]

    with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_anthropic_cls.return_value = mock_client

        result = await parse_citation(
            raw_response="We found that Acme performs well in tests.",
            brand_name="Acme Corp",
            brand_aliases=["Acme", "ACME"],
            competitors=["CompA"],
            query="best GEO tool",
            engine="claude-sonnet-4-6"
        )

        assert result is not None
        assert result["brand_mentioned"] is True

@pytest.mark.asyncio
async def test_invalid_json_returns_none():
    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = "This is malformed non-json response text."
    mock_msg.content = [mock_content]

    with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_anthropic_cls.return_value = mock_client

        result = await parse_citation(
            raw_response="Sample raw text",
            brand_name="Acme",
            brand_aliases=[],
            competitors=[],
            query="test query",
            engine="claude-sonnet-4-6"
        )

        assert result is None

@pytest.mark.asyncio
async def test_competitor_detected():
    mock_response_json = json.dumps({
        "brand_mentioned": False,
        "brand_sentiment": "not_mentioned",
        "brand_description": None,
        "brand_position": "not_mentioned",
        "competitors_mentioned": ["CompetitorX"],
        "source_urls": [],
        "citation_score": 0,
        "reasoning": "CompetitorX detected."
    })

    mock_msg = MagicMock()
    mock_content = MagicMock()
    mock_content.text = mock_response_json
    mock_msg.content = [mock_content]

    with patch("anthropic.AsyncAnthropic") as mock_anthropic_cls:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_anthropic_cls.return_value = mock_client

        result = await parse_citation(
            raw_response="CompetitorX is prominent in this query.",
            brand_name="Acme",
            brand_aliases=[],
            competitors=["CompetitorX"],
            query="best software",
            engine="claude-sonnet-4-6"
        )

        assert result is not None
        assert "CompetitorX" in result["competitors_mentioned"]

@pytest.mark.asyncio
async def test_empty_response_returns_none():
    result = await parse_citation(
        raw_response="",
        brand_name="Acme",
        brand_aliases=[],
        competitors=[],
        query="test query",
        engine="claude-sonnet-4-6"
    )
    assert result is None
