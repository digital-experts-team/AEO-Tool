import os
import json
import logging
from typing import Optional, List
import gspread
from google.oauth2.service_account import Credentials

logger = logging.getLogger("citation_tracker")

# Scopes required for Google Sheets & Drive API access
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

# Sheet Tab Constants and Headers
CLIENTS_TAB = "clients"
CLIENTS_HEADERS = ["id","name","brand_name","brand_aliases",
                   "competitors","queries","is_active","created_at",
                   "suggested_queries","suggestions_generated_at","product_description",
                   "domain","industry"]

GSC_INTEGRATIONS_TAB = "gsc_integrations"
GSC_INTEGRATIONS_HEADERS = [
    "id", "client_id", "access_token", "refresh_token", 
    "token_expiry", "site_url", "connected_at",
    "ga4_access_token", "ga4_refresh_token", "ga4_property_id", "ga4_connected_at"
]

QUERY_RUNS_TAB = "query_runs"
QUERY_RUNS_HEADERS = ["id","client_id","run_date","query","engine",
                      "raw_response","brand_mentioned","brand_sentiment",
                      "brand_description","brand_position",
                      "competitors_mentioned","source_urls",
                      "citation_score","reasoning","created_at"]

DAILY_SUMMARIES_TAB = "daily_summaries"
DAILY_SUMMARIES_HEADERS = ["id","client_id","summary_date","total_queries",
                            "cited_count","citation_rate","not_cited_queries",
                            "competitor_citation_counts","summary_text","created_at"]

COMPETITOR_GAPS_TAB = "competitor_gaps"
COMPETITOR_GAPS_HEADERS = ["id","client_id","week_start","competitor_name",
                            "client_rate","competitor_rate","gap_size",
                            "gap_severity","likely_reasons","top_priority_action",
                            "content_opportunities","timeline_to_close","created_at"]

# Module-level client singleton cache
_sheets_client_instance: Optional[gspread.Client] = None

def get_sheets_client() -> Optional[gspread.Client]:
    """
    Returns an authenticated gspread client cached as a singleton.
    Loads credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var first,
    or falls back to GOOGLE_SERVICE_ACCOUNT_PATH file path.
    On error, logs error and returns None.
    """
    global _sheets_client_instance

    if _sheets_client_instance is not None:
        return _sheets_client_instance

    try:
        sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH", "./service_account.json")

        creds = None
        if sa_json:
            logger.info("Authenticating gspread via GOOGLE_SERVICE_ACCOUNT_JSON environment variable.")
            info = json.loads(sa_json)
            creds = Credentials.from_service_account_info(info, scopes=SCOPES)
        elif sa_path and os.path.exists(sa_path):
            logger.info(f"Authenticating gspread via credentials file at: {sa_path}")
            creds = Credentials.from_service_account_file(sa_path, scopes=SCOPES)
        else:
            logger.error(f"Google service account credentials not found in env or file at path: {sa_path}")
            return None

        _sheets_client_instance = gspread.authorize(creds)
        return _sheets_client_instance
    except Exception as e:
        logger.error(f"Failed to create gspread client: {e}")
        return None

def get_or_create_worksheet(spreadsheet_id: str, tab_name: str, headers: List[str]) -> Optional[gspread.Worksheet]:
    """
    Opens the spreadsheet by ID.
    Returns the existing worksheet with tab_name, or creates a new one with headers if absent.
    On error, logs error and returns None.
    """
    try:
        client = get_sheets_client()
        if not client:
            logger.error("Cannot get or create worksheet because gspread client is None.")
            return None

        spreadsheet = client.open_by_key(spreadsheet_id)

        try:
            worksheet = spreadsheet.worksheet(tab_name)
            return worksheet
        except gspread.WorksheetNotFound:
            logger.info(f"Worksheet '{tab_name}' not found in spreadsheet '{spreadsheet_id}'. Creating new worksheet...")
            cols_count = max(len(headers), 10)
            worksheet = spreadsheet.add_worksheet(title=tab_name, rows=1000, cols=cols_count)
            worksheet.append_row(headers)
            return worksheet
    except Exception as e:
        logger.error(f"Error getting or creating worksheet '{tab_name}' in spreadsheet '{spreadsheet_id}': {e}")
        return None
