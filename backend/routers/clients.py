from fastapi import APIRouter, HTTPException, status
from typing import List
from backend.models.schemas import Client, ClientCreate
from backend.sheets.client_ops import get_all_clients, get_client_by_id, save_client

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
