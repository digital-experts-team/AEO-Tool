import os
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from backend.main import app, process_client, run_daily_job

client_api = TestClient(app)

@pytest.mark.asyncio
async def test_full_pipeline_single_client():
    test_client = {
        "id": "client-reg-1",
        "name": "Regression Brand",
        "brand_name": "RegBrand",
        "brand_aliases": ["RegBrand"],
        "competitors": ["Comp1"],
        "queries": ["query 1"]
    }

    with patch("backend.main.query_runner.run_all_engines", new_callable=AsyncMock) as mock_runner, \
         patch("backend.main.claude_parser.parse_citation", new_callable=AsyncMock) as mock_parser, \
         patch("backend.main.summarizer.generate_daily_summary", new_callable=AsyncMock) as mock_summarizer, \
         patch("backend.main.run_ops.insert_query_run") as mock_insert_run, \
         patch("backend.main.run_ops.upsert_daily_summary") as mock_upsert_sum, \
         patch("backend.main.run_ops.get_daily_summaries", return_value=[]):

        mock_runner.return_value = {"gemini": "p_resp", "claude": "c_resp"}
        mock_parser.return_value = {
            "brand_mentioned": True,
            "citation_score": 1,
            "brand_sentiment": "positive",
            "competitors_mentioned": ["Comp1"]
        }
        mock_summarizer.return_value = "Daily summary text."

        result = await process_client(test_client)

        assert result is not None
        assert result.get("client_id") == "client-reg-1"
        assert mock_runner.call_count == 1
        assert mock_parser.call_count == 2
        assert mock_insert_run.call_count == 2
        assert mock_summarizer.call_count == 1
        assert mock_upsert_sum.call_count == 1

@pytest.mark.asyncio
async def test_citation_score_aggregation():
    test_client = {
        "id": "client-reg-2",
        "name": "Agg Brand",
        "brand_name": "AggBrand",
        "queries": ["q1", "q2"]
    }

    with patch("backend.main.query_runner.run_all_engines", new_callable=AsyncMock) as mock_runner, \
         patch("backend.main.claude_parser.parse_citation", new_callable=AsyncMock) as mock_parser, \
         patch("backend.main.summarizer.generate_daily_summary", new_callable=AsyncMock) as mock_summarizer, \
         patch("backend.main.run_ops.insert_query_run"), \
         patch("backend.main.run_ops.upsert_daily_summary"), \
         patch("backend.main.run_ops.get_daily_summaries", return_value=[]):

        mock_runner.return_value = {"gemini": "resp", "claude": "resp"}
        
        # 4 total engine runs: return True twice, False twice
        mock_parser.side_effect = [
            {"brand_mentioned": True, "citation_score": 1},
            {"brand_mentioned": True, "citation_score": 1},
            {"brand_mentioned": False, "citation_score": 0},
            {"brand_mentioned": False, "citation_score": 0}
        ]
        mock_summarizer.return_value = "Summary"

        summary = await process_client(test_client)

        assert summary["total_queries"] == 4
        assert summary["cited_count"] == 2
        assert summary["citation_rate"] == 50.0

@pytest.mark.asyncio
async def test_client_failure_does_not_stop_other_clients():
    client_1 = {"id": "c1", "name": "Fail Client", "queries": ["q1"]}
    client_2 = {"id": "c2", "name": "Success Client", "queries": ["q2"]}

    with patch("backend.main.client_ops.get_all_active_clients", return_value=[client_1, client_2]), \
         patch("backend.main.process_client", new_callable=AsyncMock) as mock_process, \
         patch("asyncio.sleep", new_callable=AsyncMock):

        mock_process.side_effect = [
            {"status": "failed", "error": "Simulated exception"},
            {"client_id": "c2", "summary_text": "Success!"}
        ]

        # Should complete without throwing top-level uncaught exception
        await run_daily_job()

        assert mock_process.call_count == 2

@pytest.mark.asyncio
async def test_yesterday_rate_comparison():
    test_client = {
        "id": "client-reg-3",
        "name": "Trend Brand",
        "queries": ["q1"]
    }

    with patch("backend.main.query_runner.run_all_engines", new_callable=AsyncMock) as mock_runner, \
         patch("backend.main.claude_parser.parse_citation", new_callable=AsyncMock) as mock_parser, \
         patch("backend.main.summarizer.generate_daily_summary", new_callable=AsyncMock) as mock_summarizer, \
         patch("backend.main.run_ops.insert_query_run"), \
         patch("backend.main.run_ops.upsert_daily_summary"), \
         patch("backend.main.run_ops.get_daily_summaries", return_value=[{"citation_rate": "40.0"}]):

        mock_runner.return_value = {"gemini": "resp"} # 1 run
        mock_parser.return_value = {"brand_mentioned": True, "citation_score": 1} # 100% rate
        mock_summarizer.return_value = "Trend summary"

        await process_client(test_client)

        assert mock_summarizer.call_count == 1
        call_kwargs = mock_summarizer.call_args.kwargs
        assert call_kwargs["yesterday_rate"] == 40.0
        assert call_kwargs["citation_rate"] == 100.0

def test_api_endpoint_run_now_requires_secret():
    with patch.dict(os.environ, {"CRON_SECRET": "test-secret-123"}):
        response = client_api.post("/run-now")
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid CRON_SECRET header"

def test_api_endpoint_health_check():
    response = client_api.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_sheets_rate_limit_sleep():
    clients = [
        {"id": "c1", "queries": []},
        {"id": "c2", "queries": []},
        {"id": "c3", "queries": []}
    ]

    with patch("backend.main.client_ops.get_all_active_clients", return_value=clients), \
         patch("backend.main.process_client", new_callable=AsyncMock) as mock_process, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:

        mock_process.return_value = {"status": "ok"}

        await run_daily_job()

        assert mock_process.call_count == 3
        # asyncio.sleep(2) should be called between clients (2 times for 3 clients)
        assert mock_sleep.call_count == 2
        mock_sleep.assert_called_with(2)
