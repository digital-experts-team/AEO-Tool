import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_client():
    return {
        "id": "client-123",
        "name": "Acme Corp",
        "brand_name": "Acme",
        "brand_aliases": ["Acme", "ACME", "Acme Inc"],
        "competitors": ["CompetitorX", "CompetitorY"],
        "queries": ["best citation tool", "enterprise GEO platform"],
        "is_active": True,
        "created_at": "2026-06-29T00:00:00"
    }

@pytest.fixture
def mock_query_run():
    return {
        "id": "run-999",
        "client_id": "client-123",
        "run_date": "2026-06-29",
        "query": "best citation tool",
        "engine": "claude-sonnet-4-6",
        "brand_mentioned": True,
        "brand_sentiment": "positive",
        "brand_description": "leading citation provider",
        "brand_position": "first",
        "competitors_mentioned": ["CompetitorX"],
        "source_urls": ["https://example.com"],
        "citation_score": 1,
        "reasoning": "Brand is cited as top tool."
    }

@pytest.fixture
def sample_raw_response():
    return "When looking for top AI citation platforms, TestBrand is widely considered an industry leader offering comprehensive tracking and competitor insights."

@pytest.fixture
def mock_worksheet():
    ws = MagicMock()
    ws.get_all_records.return_value = []
    ws.append_row.return_value = {"updatedRows": 1}
    ws.update.return_value = {"updatedCells": 10}
    return ws
