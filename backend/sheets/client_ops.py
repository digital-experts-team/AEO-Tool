import os
import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from backend.sheets.sheets_client import (
    get_or_create_worksheet,
    CLIENTS_TAB,
    CLIENTS_HEADERS,
    COMPETITOR_GAPS_TAB,
    COMPETITOR_GAPS_HEADERS
)

logger = logging.getLogger("citation_tracker")

_clients_cache = None
_clients_cache_time = None

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
    global _clients_cache, _clients_cache_time
    now = datetime.now(timezone.utc)
    if _clients_cache is not None and _clients_cache_time is not None:
        if (now - _clients_cache_time).total_seconds() < 15:
            return _clients_cache
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return []

        worksheet = get_or_create_worksheet(sheet_id, CLIENTS_TAB, CLIENTS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire clients worksheet.")
            return []

        # Auto-migrate: ensure header row has all expected columns
        try:
            existing_headers = worksheet.row_values(1)
            missing_cols = [h for h in CLIENTS_HEADERS if h not in existing_headers]
            if missing_cols:
                for col_name in missing_cols:
                    worksheet.update_cell(1, len(existing_headers) + 1, col_name)
                    existing_headers.append(col_name)
        except Exception as hdr_err:
            logger.warning(f"Could not auto-migrate headers: {hdr_err}")

        try:
            records = worksheet.get_all_records(expected_headers=CLIENTS_HEADERS)
        except Exception:
            # Fallback: read raw rows and map by position
            records = []
            all_rows = worksheet.get_all_values()
            if all_rows:
                hdrs = all_rows[0]
                for raw_row in all_rows[1:]:
                    row_dict = {}
                    for idx, h in enumerate(hdrs):
                        row_dict[h] = raw_row[idx] if idx < len(raw_row) else ""
                    records.append(row_dict)

        active_clients = []

        print(f"[Diagnostic] Total raw records retrieved: {len(records)}")
        for row in records:
            client_id = str(row.get("id", "")).strip()
            print(f"[Diagnostic] Row ID: '{client_id}', Name: '{row.get('name')}', is_active: {row.get('is_active')}")
            if not client_id:
                print(f"[Diagnostic] Skipping row due to empty ID")
                continue  # Skip malformed/empty rows

            is_active_val = row.get("is_active")
            if is_active_val is None or str(is_active_val).strip() == "":
                is_active_val = "True"
                
            if str(is_active_val).strip().lower() == "true":
                client_dict = dict(row)
                client_dict["is_active"] = True
                client_dict["brand_aliases"] = _pipe_to_list(row.get("brand_aliases"))
                client_dict["competitors"] = _pipe_to_list(row.get("competitors"))
                client_dict["queries"] = _pipe_to_list(row.get("queries"))
                active_clients.append(client_dict)

        print(f"[Diagnostic] Total active clients returned: {len(active_clients)}")
        _clients_cache = active_clients
        _clients_cache_time = now
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
        created_at = data.get("created_at", datetime.now(timezone.utc).isoformat())
        is_active = str(data.get("is_active", True))

        client_record = {
            "id": new_id,
            "name": str(data.get("name", "")),
            "brand_name": str(data.get("brand_name", "")),
            "brand_aliases": data.get("brand_aliases", []),
            "competitors": data.get("competitors", []),
            "queries": data.get("queries", []),
            "is_active": is_active,
            "created_at": created_at,
            "suggested_queries": data.get("suggested_queries", ""),
            "suggestions_generated_at": data.get("suggestions_generated_at", ""),
            "product_description": data.get("product_description", ""),
            "domain": data.get("domain", ""),
            "industry": data.get("industry", "")
        }

        row = []
        for h in CLIENTS_HEADERS:
            val = client_record.get(h, "")
            if isinstance(val, list):
                row.append(_list_to_pipe(val))
            else:
                row.append(str(val))

        worksheet.append_row(row)
        return client_record
    except Exception as e:
        logger.error(f"Error creating client: {e}")
        return None

def update_client_fields(client_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Finds client row by client_id in the clients worksheet and updates the specified columns.
    Clears cache so the updated values are read immediately.
    """
    global _clients_cache, _clients_cache_time
    _clients_cache = None
    _clients_cache_time = None
    
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return None

        worksheet = get_or_create_worksheet(sheet_id, CLIENTS_TAB, CLIENTS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire clients worksheet.")
            return None

        records = worksheet.get_all_records()
        row_idx = None
        for idx, row in enumerate(records):
            if str(row.get("id")) == str(client_id):
                row_idx = idx + 2
                break

        if not row_idx:
            logger.error(f"Client '{client_id}' not found in sheet for update.")
            return None

        for key, val in fields.items():
            if key in CLIENTS_HEADERS:
                col_idx = CLIENTS_HEADERS.index(key) + 1
                if isinstance(val, list):
                    cell_val = _list_to_pipe(val)
                elif isinstance(val, bool):
                    cell_val = str(val)
                else:
                    cell_val = str(val)
                worksheet.update_cell(row_idx, col_idx, cell_val)
                
        return get_client_by_id(client_id)
    except Exception as e:
        logger.error(f"Error updating client {client_id}: {e}")
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
        created_at = data.get("created_at", datetime.now(timezone.utc).isoformat())

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


def delete_client(client_id: str) -> bool:
    """
    Soft-deletes a client by setting is_active=False in the clients worksheet.
    Also clears the in-memory cache so the change is reflected immediately.
    Returns True on success, False on failure.
    """
    global _clients_cache, _clients_cache_time
    try:
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID env var is missing.")
            return False

        worksheet = get_or_create_worksheet(sheet_id, CLIENTS_TAB, CLIENTS_HEADERS)
        if not worksheet:
            logger.error("Failed to acquire clients worksheet.")
            return False

        all_rows = worksheet.get_all_values()
        if not all_rows:
            return False

        headers = all_rows[0]
        id_col_idx = headers.index("id") + 1 if "id" in headers else None
        active_col_idx = headers.index("is_active") + 1 if "is_active" in headers else None

        if id_col_idx is None or active_col_idx is None:
            logger.error("Could not find 'id' or 'is_active' columns in clients sheet.")
            return False

        for row_idx, row in enumerate(all_rows[1:], start=2):
            row_id = row[id_col_idx - 1] if len(row) >= id_col_idx else ""
            if str(row_id).strip() == str(client_id).strip():
                worksheet.update_cell(row_idx, active_col_idx, "False")
                # Bust the cache
                _clients_cache = None
                _clients_cache_time = None
                logger.info(f"Soft-deleted client '{client_id}' — is_active set to False")
                return True

        logger.warning(f"Client '{client_id}' not found in sheet for deletion.")
        return False
    except Exception as e:
        logger.error(f"Error deleting client '{client_id}': {e}")
        return False

