import os
import pytest
from unittest.mock import patch, MagicMock
from backend.sheets.run_ops import insert_query_run, get_query_runs_by_date, upsert_daily_summary
from backend.sheets.client_ops import get_all_active_clients, create_client, _pipe_to_list, _list_to_pipe

def test_insert_query_run_appends_row(mock_worksheet, mock_query_run):
    with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "mock-sheet-id"}):
        with patch("backend.sheets.run_ops.get_or_create_worksheet", return_value=mock_worksheet):
            run_id = insert_query_run(mock_query_run)

            assert run_id is not None
            assert mock_worksheet.append_row.call_count == 1

            appended_row = mock_worksheet.append_row.call_args[0][0]
            # Verify competitors_mentioned and source_urls are converted to pipe-separated strings
            assert appended_row[10] == "CompetitorX"
            assert appended_row[11] == "https://example.com"

def test_get_query_runs_by_date_filters_correctly(mock_worksheet):
    mock_records = [
        {"client_id": "client-1", "run_date": "2026-06-29", "query": "q1", "competitors_mentioned": "A|B", "source_urls": ""},
        {"client_id": "client-1", "run_date": "2026-06-29", "query": "q2", "competitors_mentioned": "", "source_urls": ""},
        {"client_id": "client-1", "run_date": "2026-06-29", "query": "q3", "competitors_mentioned": "", "source_urls": ""},
        {"client_id": "client-1", "run_date": "2026-06-28", "query": "q4", "competitors_mentioned": "", "source_urls": ""}, # Different date
        {"client_id": "client-2", "run_date": "2026-06-29", "query": "q5", "competitors_mentioned": "", "source_urls": ""}  # Different client
    ]
    mock_worksheet.get_all_records.return_value = mock_records

    with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "mock-sheet-id"}):
        with patch("backend.sheets.run_ops.get_or_create_worksheet", return_value=mock_worksheet):
            results = get_query_runs_by_date("client-1", "2026-06-29")
            assert len(results) == 3

def test_upsert_daily_summary_creates_new_row(mock_worksheet):
    mock_worksheet.get_all_records.return_value = [] # Empty list, no existing summary

    summary_data = {
        "total_queries": 10,
        "cited_count": 8,
        "citation_rate": 80.0,
        "not_cited_queries": ["q1"],
        "competitor_citation_counts": {"CompA": 2},
        "summary_text": "Great day!"
    }

    with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "mock-sheet-id"}):
        with patch("backend.sheets.run_ops.get_or_create_worksheet", return_value=mock_worksheet):
            success = upsert_daily_summary("client-1", "2026-06-29", summary_data)

            assert success is True
            assert mock_worksheet.append_row.call_count == 1
            assert mock_worksheet.update.call_count == 0

def test_upsert_daily_summary_updates_existing_row(mock_worksheet):
    mock_records = [
        {"id": "sum-1", "client_id": "client-1", "summary_date": "2026-06-29", "created_at": "2026-06-29T00:00:00"}
    ]
    mock_worksheet.get_all_records.return_value = mock_records

    summary_data = {
        "total_queries": 10,
        "cited_count": 9,
        "citation_rate": 90.0,
        "summary_text": "Updated brief!"
    }

    with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "mock-sheet-id"}):
        with patch("backend.sheets.run_ops.get_or_create_worksheet", return_value=mock_worksheet):
            success = upsert_daily_summary("client-1", "2026-06-29", summary_data)

            assert success is True
            assert mock_worksheet.update.call_count == 1
            assert mock_worksheet.append_row.call_count == 0

def test_get_all_active_clients_filters_inactive(mock_worksheet):
    mock_records = [
        {"id": "c1", "name": "Client 1", "is_active": "True", "brand_aliases": "A", "competitors": "B", "queries": "Q"},
        {"id": "c2", "name": "Client 2", "is_active": "True", "brand_aliases": "A", "competitors": "B", "queries": "Q"},
        {"id": "c3", "name": "Client 3", "is_active": "False", "brand_aliases": "A", "competitors": "B", "queries": "Q"}
    ]
    mock_worksheet.get_all_records.return_value = mock_records

    with patch.dict(os.environ, {"GOOGLE_SHEET_ID": "mock-sheet-id"}):
        with patch("backend.sheets.client_ops.get_or_create_worksheet", return_value=mock_worksheet):
            clients = get_all_active_clients()
            assert len(clients) == 2
            assert set(c["id"] for c in clients) == {"c1", "c2"}

def test_pipe_separated_lists_round_trip():
    original_competitors = ["A", "B", "C"]
    pipe_str = _list_to_pipe(original_competitors)
    assert pipe_str == "A|B|C"

    parsed_back = _pipe_to_list(pipe_str)
    assert parsed_back == original_competitors
