import os
import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from backend.sheets.sheets_client import (
    get_or_create_worksheet,
    QUERY_RUNS_TAB,
    QUERY_RUNS_HEADERS,
    DAILY_SUMMARIES_TAB,
    DAILY_SUMMARIES_HEADERS
)

logger = logging.getLogger("citation_tracker")

def _list_to_pipe(val: Any) -> str:
    """Helper to convert list or dict to a stored string representation."""
    if isinstance(val, list):
        return "|".join(str(x).strip() for x in val)
    if isinstance(val, (dict, tuple)):
        return json.dumps(val)
    return str(val) if val is not None else ""

def _pipe_to_list(val: Any) -> List[str]:
    """Helper to split pipe-separated string back into a Python list."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(x) for x in val]
    return [x.strip() for x in str(val).split("|") if x.strip()]

def insert_query_run(data: Dict[str, Any]) -> Optional[str]:
    """
    Generates a new UUID for id, adds created_at timestamp, converts list fields
    to pipe-separated strings, and appends a row to query_runs worksheet.
    Returns the new row id. On error, logs and returns None.
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return None

        worksheet = get_or_create_worksheet(sheet_id, QUERY_RUNS_TAB, QUERY_RUNS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire query_runs worksheet.")
            return None

        new_id = str(uuid.uuid4())
        created_at = data.get("created_at", datetime.now().isoformat())
        run_date = data.get("run_date", datetime.now().strftime("%Y-%m-%d"))

        row = [
            new_id,
            str(data.get("client_id", "")),
            str(run_date),
            str(data.get("query", "")),
            str(data.get("engine", "")),
            str(data.get("raw_response", "")),
            str(data.get("brand_mentioned", "")),
            str(data.get("brand_sentiment", "")),
            str(data.get("brand_description", "")),
            str(data.get("brand_position", "")),
            _list_to_pipe(data.get("competitors_mentioned", [])),
            _list_to_pipe(data.get("source_urls", [])),
            str(data.get("citation_score", "")),
            str(data.get("reasoning", "")),
            created_at
        ]

        worksheet.append_row(row)
        return new_id
    except Exception as e:
        logger.error(f"Error inserting query run: {e}")
        return None

def get_query_runs_by_date(client_id: str, date: str) -> List[Dict[str, Any]]:
    """
    Gets all rows from query_runs worksheet, filters by client_id and run_date matching date string,
    converts pipe-separated fields back to lists, and returns list of run dicts.
    On error, logs and returns [].
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, QUERY_RUNS_TAB, QUERY_RUNS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire query_runs worksheet.")
            return []

        records = worksheet.get_all_records()
        matching_runs = []

        target_date_str = str(date).strip()[:10]

        for row in records:
            row_client_id = str(row.get("client_id")).strip()
            row_run_date = str(row.get("run_date")).strip()[:10]

            if row_client_id == str(client_id).strip() and row_run_date == target_date_str:
                run_dict = dict(row)
                run_dict["competitors_mentioned"] = _pipe_to_list(row.get("competitors_mentioned"))
                run_dict["source_urls"] = _pipe_to_list(row.get("source_urls"))
                matching_runs.append(run_dict)

        return matching_runs
    except Exception as e:
        logger.error(f"Error getting query runs by date for client '{client_id}': {e}")
        return []

def get_query_runs_last_n_days(client_id: str, n: int) -> List[Dict[str, Any]]:
    """
    Gets all rows from query_runs worksheet, filters by client_id where run_date is within
    the last n days from today, and returns list of run dicts sorted by run_date descending.
    On error, logs and returns [].
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, QUERY_RUNS_TAB, QUERY_RUNS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire query_runs worksheet.")
            return []

        records = worksheet.get_all_records()
        client_runs = []

        today_date = datetime.now().date()
        cutoff_date = today_date - timedelta(days=n)

        for row in records:
            if str(row.get("client_id")).strip() == str(client_id).strip():
                run_date_str = str(row.get("run_date")).strip()[:10]
                try:
                    r_date = datetime.strptime(run_date_str, "%Y-%m-%d").date()
                    if r_date >= cutoff_date:
                        run_dict = dict(row)
                        run_dict["competitors_mentioned"] = _pipe_to_list(row.get("competitors_mentioned"))
                        run_dict["source_urls"] = _pipe_to_list(row.get("source_urls"))
                        client_runs.append(run_dict)
                except ValueError:
                    # If date parsing fails, include or skip based on fallback
                    continue

        # Sort by run_date descending
        client_runs.sort(key=lambda x: str(x.get("run_date", "")), reverse=True)
        return client_runs
    except Exception as e:
        logger.error(f"Error getting query runs for last {n} days for client '{client_id}': {e}")
        return []

def upsert_daily_summary(client_id: str, date: str, data: Dict[str, Any]) -> bool:
    """
    Gets all rows from daily_summaries worksheet.
    Updates row if matching client_id and summary_date == date exists,
    otherwise appends a new row with a generated UUID.
    Returns True on success, False on failure.
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return False

        worksheet = get_or_create_worksheet(sheet_id, DAILY_SUMMARIES_TAB, DAILY_SUMMARIES_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire daily_summaries worksheet.")
            return False

        records = worksheet.get_all_records()
        target_date_str = str(date).strip()[:10]

        matching_row_index = None
        existing_id = None
        existing_created_at = None

        for idx, row in enumerate(records):
            r_client_id = str(row.get("client_id")).strip()
            r_summary_date = str(row.get("summary_date")).strip()[:10]
            if r_client_id == str(client_id).strip() and r_summary_date == target_date_str:
                matching_row_index = idx + 2  # Row 1 is headers in 1-indexed gspread
                existing_id = row.get("id")
                existing_created_at = row.get("created_at")
                break

        summary_id = existing_id if existing_id else str(uuid.uuid4())
        created_at = existing_created_at if existing_created_at else data.get("created_at", datetime.now().isoformat())

        row_values = [
            summary_id,
            str(client_id),
            target_date_str,
            str(data.get("total_queries", 0)),
            str(data.get("cited_count", 0)),
            str(data.get("citation_rate", 0.0)),
            _list_to_pipe(data.get("not_cited_queries", [])),
            _list_to_pipe(data.get("competitor_citation_counts", {})),
            str(data.get("summary_text", "")),
            created_at
        ]

        if matching_row_index:
            range_name = f"A{matching_row_index}:J{matching_row_index}"
            worksheet.update(values=[row_values], range_name=range_name)
            logger.info(f"Updated existing daily summary row {matching_row_index} for client '{client_id}' on '{target_date_str}'.")
        else:
            worksheet.append_row(row_values)
            logger.info(f"Appended new daily summary row for client '{client_id}' on '{target_date_str}'.")

        return True
    except Exception as e:
        logger.error(f"Error upserting daily summary for client '{client_id}' on '{date}': {e}")
        return False

def get_daily_summaries(client_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """
    Gets all rows from daily_summaries worksheet, filters by client_id,
    and returns up to days count of most recent records, sorted by summary_date descending.
    On error, logs and returns [].
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, DAILY_SUMMARIES_TAB, DAILY_SUMMARIES_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire daily_summaries worksheet.")
            return []

        records = worksheet.get_all_records()
        client_summaries = []

        for row in records:
            if str(row.get("client_id")).strip() == str(client_id).strip():
                sum_dict = dict(row)
                sum_dict["not_cited_queries"] = _pipe_to_list(row.get("not_cited_queries"))
                client_summaries.append(sum_dict)

        # Sort by summary_date descending
        client_summaries.sort(key=lambda x: str(x.get("summary_date", "")), reverse=True)
        return client_summaries[:days] if days > 0 else client_summaries
    except Exception as e:
        logger.error(f"Error getting daily summaries for client '{client_id}': {e}")
        return []
