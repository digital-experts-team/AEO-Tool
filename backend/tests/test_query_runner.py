import os
import pytest
import httpx
from unittest.mock import patch, MagicMock, AsyncMock
from backend.services.query_runner import query_gemini, query_claude, run_all_engines

@pytest.mark.asyncio
async def test_gemini_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "Gemini search results content."}]}}]
    }

    with patch.dict(os.environ, {"GEMINI_API_KEY": "mock-key"}):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await query_gemini("best AI citation platform")
            assert result == "Gemini search results content."

@pytest.mark.asyncio
async def test_gemini_timeout():
    with patch.dict(os.environ, {"GEMINI_API_KEY": "mock-key"}):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Connection timed out")

            result = await query_gemini("best AI citation platform")
            assert result is None

@pytest.mark.asyncio
async def test_gemini_http_error():
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    with patch.dict(os.environ, {"GEMINI_API_KEY": "mock-key"}):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await query_gemini("best AI citation platform")
            assert result is None

@pytest.mark.asyncio
async def test_run_all_engines_both_succeed():
    with patch("backend.services.query_runner.query_gemini", new_callable=AsyncMock) as mock_gemini, \
         patch("backend.services.query_runner.query_claude", new_callable=AsyncMock) as mock_claude:
        mock_gemini.return_value = "Gemini text response"
        mock_claude.return_value = "Claude text response"

        res = await run_all_engines("sample query")
        assert res["gemini"] == "Gemini text response"
        assert res["claude"] == "Claude text response"

@pytest.mark.asyncio
async def test_run_all_engines_one_fails():
    with patch("backend.services.query_runner.query_gemini", new_callable=AsyncMock) as mock_gemini, \
         patch("backend.services.query_runner.query_claude", new_callable=AsyncMock) as mock_claude:
        mock_gemini.return_value = "Gemini text response"
        mock_claude.return_value = None

        res = await run_all_engines("sample query")
        assert res["gemini"] == "Gemini text response"
        assert res["claude"] is None

