from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.models.schemas import QueryResult, QueryRunRequest
from backend.services.query_runner import QueryRunner
from backend.sheets.run_ops import get_query_runs

router = APIRouter(prefix="/api/queries", tags=["Queries"])

@router.get("/history", response_model=List[QueryResult])
def get_history(client_id: Optional[str] = None):
    return get_query_runs(client_id=client_id)

@router.post("/run", response_model=QueryResult)
async def execute_query(request: QueryRunRequest):
    try:
        return await QueryRunner.run_query(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution error: {str(e)}")
