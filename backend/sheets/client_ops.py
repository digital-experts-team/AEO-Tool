import os
import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.sheets.sheets_client import (
    get_or_create_worksheet,
    CLIENTS_TAB,
    CLIENTS_HEADERS,
    COMPETITOR_GAPS_TAB,
    COMPETITOR_GAPS_HEADERS
)

logger = logging.getLogger("citation_tracker")

def _list_to_pipe(val: Any) -> str:
    """Helper to convert list or iterable to a pipe-separated string."""
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

def get_all_active_clients() -> List[Dict[str, Any]]:
    """
    Opens the clients worksheet and reads all active client records.
    Splits pipe-separated lists back into Python lists.
    On error, logs and returns [].
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, CLIENTS_TAB, CLIENTS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire clients worksheet.")
            return []

        records = worksheet.get_all_records()
        active_clients = []

        for row in records:
            is_active = row.get("is_active")
            if str(is_active).strip().lower() == "true":
                client_dict = dict(row)
                client_dict["brand_aliases"] = _pipe_to_list(row.get("brand_aliases"))
                client_dict["competitors"] = _pipe_to_list(row.get("competitors"))
                client_dict["queries"] = _pipe_to_list(row.get("queries"))
                active_clients.append(client_dict)

        return active_clients
    except Exception as e:
        logger.error(f"Error getting active clients: {e}")
        return []

def get_client_by_id(client_id: str) -> Optional[Dict[str, Any]]:
    """
    Finds and returns active client dictionary matching client_id.
    On error or not found, logs and returns None.
    """
    try:
        clients = get_all_active_clients()
        for client in clients:
            if str(client.get("id")) == str(client_id):
                return client
        return None
    except Exception as e:
        logger.error(f"Error fetching client by ID '{client_id}': {e}")
        return None

def create_client(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Generates a new UUID for id, formats pipe-separated lists, and appends
    a new client record to the clients worksheet.
    On error, logs and returns None.
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return None

        worksheet = get_or_create_worksheet(sheet_id, CLIENTS_TAB, CLIENTS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire clients worksheet.")
            return None

        new_id = str(uuid.uuid4())
        created_at = data.get("created_at", datetime.now().isoformat())
        is_active = str(data.get("is_active", True))

        client_record = {
            "id": new_id,
            "name": str(data.get("name", "")),
            "brand_name": str(data.get("brand_name", "")),
            "brand_aliases": data.get("brand_aliases", []),
            "competitors": data.get("competitors", []),
            "queries": data.get("queries", []),
            "is_active": is_active,
            "created_at": created_at
        }

        row = [
            client_record["id"],
            client_record["name"],
            client_record["brand_name"],
            _list_to_pipe(client_record["brand_aliases"]),
            _list_to_pipe(client_record["competitors"]),
            _list_to_pipe(client_record["queries"]),
            client_record["is_active"],
            client_record["created_at"]
        ]

        worksheet.append_row(row)
        return client_record
    except Exception as e:
        logger.error(f"Error creating client: {e}")
        return None

def insert_competitor_gap(data: Dict[str, Any]) -> Optional[str]:
    """
    Generates a new UUID for id and appends a row to competitor_gaps worksheet.
    Returns the new row id. On error, logs and returns None.
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return None

        worksheet = get_or_create_worksheet(sheet_id, COMPETITOR_GAPS_TAB, COMPETITOR_GAPS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire competitor_gaps worksheet.")
            return None

        new_id = str(uuid.uuid4())
        created_at = data.get("created_at", datetime.now().isoformat())

        row = [
            new_id,
            str(data.get("client_id", "")),
            str(data.get("week_start", "")),
            str(data.get("competitor_name", "")),
            str(data.get("client_rate", "")),
            str(data.get("competitor_rate", "")),
            str(data.get("gap_size", "")),
            str(data.get("gap_severity", "")),
            _list_to_pipe(data.get("likely_reasons", [])),
            str(data.get("top_priority_action", "")),
            _list_to_pipe(data.get("content_opportunities", [])),
            str(data.get("timeline_to_close", "")),
            created_at
        ]

        worksheet.append_row(row)
        return new_id
    except Exception as e:
        logger.error(f"Error inserting competitor gap: {e}")
        return None

def get_competitor_gaps(client_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Gets all rows from competitor_gaps worksheet, filters by client_id,
    and returns up to limit most recent records.
    On error, logs and returns [].
    """
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, COMPETITOR_GAPS_TAB, COMPETITOR_GAPS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire competitor_gaps worksheet.")
            return []

        records = worksheet.get_all_records()
        client_gaps = []

        for row in records:
            if str(row.get("client_id")) == str(client_id):
                gap_dict = dict(row)
                gap_dict["likely_reasons"] = _pipe_to_list(row.get("likely_reasons"))
                gap_dict["content_opportunities"] = _pipe_to_list(row.get("content_opportunities"))
                client_gaps.append(gap_dict)

        # Return the most recent records up to limit
        return client_gaps[-limit:] if limit > 0 else client_gaps
    except Exception as e:
        logger.error(f"Error getting competitor gaps for client '{client_id}': {e}")
        return []
