import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from backend.sheets.sheets_client import get_or_create_worksheet, GSC_INTEGRATIONS_TAB, GSC_INTEGRATIONS_HEADERS
from backend.sheets.client_ops import get_client_by_id
from backend.services.gsc_client import (
    get_auth_url,
    exchange_code_for_tokens,
    refresh_access_token,
    get_gsc_site_list,
    get_aio_data,
    get_ga4_ai_traffic
)

router = APIRouter(prefix="/api/gsc", tags=["Google Search Console"])

def get_integration_record(client_id: str) -> Optional[Dict[str, Any]]:
    """Helper to fetch client integration row from sheets."""
    sheet_id = os.getenv("GOOGLE_SHEET_ID")
    if not sheet_id:
        return None
        
    worksheet = get_or_create_worksheet(sheet_id, GSC_INTEGRATIONS_TAB, GSC_INTEGRATIONS_HEADERS)
    if not worksheet:
        return None
        
    records = worksheet.get_all_records()
    for row in records:
        if str(row.get("client_id")) == str(client_id):
            return dict(row)
    return None

def save_integration_record(client_id: str, fields: Dict[str, Any]) -> bool:
    """Helper to upsert client integration row to sheets."""
    sheet_id = os.getenv("GOOGLE_SHEET_ID")
    if not sheet_id:
        return False
        
    worksheet = get_or_create_worksheet(sheet_id, GSC_INTEGRATIONS_TAB, GSC_INTEGRATIONS_HEADERS)
    if not worksheet:
        return False
        
    records = worksheet.get_all_records()
    row_idx = None
    for idx, row in enumerate(records):
        if str(row.get("client_id")) == str(client_id):
            row_idx = idx + 2
            break
            
    now_str = datetime.now(timezone.utc).isoformat()
    
    if row_idx:
        # Update existing
        for key, val in fields.items():
            if key in GSC_INTEGRATIONS_HEADERS:
                col_idx = GSC_INTEGRATIONS_HEADERS.index(key) + 1
                worksheet.update_cell(row_idx, col_idx, str(val))
    else:
        # Create new
        new_id = str(uuid.uuid4())
        record = {h: "" for h in GSC_INTEGRATIONS_HEADERS}
        record.update({
            "id": new_id,
            "client_id": client_id,
            "connected_at": now_str,
            "ga4_connected_at": now_str
        })
        record.update(fields)
        
        row = [record[h] for h in GSC_INTEGRATIONS_HEADERS]
        worksheet.append_row(row)
        
    return True

@router.get("/connect/{client_id}")
def start_gsc_oauth(client_id: str):
    """Generates and returns Google combined OAuth URL for GSC & GA4."""
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    url = get_auth_url(client_id)
    return {"auth_url": url, "client_id": client_id}

@router.get("/callback")
async def gsc_oauth_callback(code: str, state: str):
    """Callback landing route after user grants permissions."""
    client_id = state
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    try:
        tokens = await exchange_code_for_tokens(code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    expires_in = tokens.get("expires_in", 3600)
    expiry = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
    
    # Get GSC site URLs
    sites = await get_gsc_site_list(access_token)
    site_url = sites[0] if sites else ""
    if not site_url:
        # fallback to client domain if no verified siteUrl
        site_url = f"sc-domain:{client.get('domain', '')}"
        
    ga4_prop = os.getenv("GA4_PROPERTY_ID", "")
    
    # Save connection tokens
    save_integration_record(client_id, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expiry": expiry,
        "site_url": site_url,
        "ga4_access_token": access_token,
        "ga4_refresh_token": refresh_token,
        "ga4_property_id": ga4_prop
    })
    
    # Redirect to the frontend brand detail page
    return RedirectResponse(url=f"http://localhost:3000/client/{client_id}?gsc=connected")

@router.get("/status/{client_id}")
def get_gsc_status(client_id: str):
    """Checks and returns the current integration connection status."""
    rec = get_integration_record(client_id)
    if rec and rec.get("access_token"):
        return {
            "connected": True,
            "site_url": rec.get("site_url"),
            "ga4_property_id": rec.get("ga4_property_id"),
            "connected_at": rec.get("connected_at")
        }
    return {"connected": False, "site_url": None, "connected_at": None}

async def get_valid_access_token(rec: Dict[str, Any]) -> Optional[str]:
    """Ensures token is not expired, refreshing if necessary."""
    access_token = rec.get("access_token")
    refresh_token = rec.get("refresh_token")
    expiry_str = rec.get("token_expiry")
    
    if not refresh_token:
        return access_token
        
    # Check if expired
    is_expired = True
    if expiry_str:
        try:
            expiry = datetime.fromisoformat(expiry_str)
            if datetime.now(timezone.utc) < expiry - timedelta(minutes=5):
                is_expired = False
        except Exception:
            pass
            
    if is_expired:
        new_token = await refresh_access_token(refresh_token)
        if new_token:
            expiry_new = (datetime.now(timezone.utc) + timedelta(seconds=3600)).isoformat()
            save_integration_record(rec.get("client_id"), {
                "access_token": new_token,
                "token_expiry": expiry_new,
                "ga4_access_token": new_token
            })
            return new_token
            
    return access_token

@router.get("/aeo-data/{client_id}")
async def get_aeo_data(client_id: str, days: int = 30):
    """Fetches Google Search Console AIO dashboard data."""
    rec = get_integration_record(client_id)
    if not rec or not rec.get("access_token"):
        return {"connected": False}
        
    token = await get_valid_access_token(rec)
    if not token:
        return {"connected": False}
        
    site_url = rec.get("site_url", "")
    data = await get_aio_data(token, site_url, days)
    return {
        "connected": True,
        **data
    }

@router.get("/ga4-traffic/{client_id}")
async def get_ga4_traffic(client_id: str, days: int = 30):
    """Fetches GA4 AI referrers traffic details."""
    rec = get_integration_record(client_id)
    if not rec or not rec.get("access_token"):
        return {"connected": False}
        
    token = await get_valid_access_token(rec)
    if not token:
        return {"connected": False}
        
    prop_id = rec.get("ga4_property_id") or os.getenv("GA4_PROPERTY_ID", "")
    if not prop_id:
        return {"connected": True, "ga4_connected": False, "reason": "No property ID configured"}
        
    data = await get_ga4_ai_traffic(token, prop_id, days)
    return {
        "connected": True,
        "ga4_connected": True,
        **data
    }
