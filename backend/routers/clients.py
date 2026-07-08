from fastapi import APIRouter, HTTPException, status
from typing import List
from backend.models.schemas import Client, ClientCreate
from backend.sheets.client_ops import get_all_clients, get_client_by_id, save_client, update_client_fields
from typing import Dict

router = APIRouter(prefix="/api/clients", tags=["Clients"])

@router.get("", response_model=List[Client])
def list_clients():
    return get_all_clients()

@router.get("/{client_id}", response_model=Client)
def get_client(client_id: str):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client

@router.post("", response_model=Client, status_code=status.HTTP_201_CREATED)
def create_client(client: ClientCreate):
    return save_client(client)

@router.patch("/{client_id}/product-description")
def update_product_description(client_id: str, body: Dict[str, str]):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        
    desc = body.get("product_description", "")
    updated = update_client_fields(client_id, {"product_description": desc})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update product description in sheet")
    return updated
