from fastapi import APIRouter, Depends, HTTPException

from database import DatabaseError, PredictionDatabase, get_database

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def history(database: PredictionDatabase = Depends(get_database)) -> dict:
    try:
        return {
            "predictions": database.list_predictions(),
            "farmer_sessions": database.list_farmer_sessions(),
        }
    except DatabaseError as exc:
        raise HTTPException(
            status_code=503, detail=f"Prediction history is unavailable: {exc}"
        ) from exc


@router.delete("")
def clear_history(database: PredictionDatabase = Depends(get_database)) -> dict:
    try:
        return {"deleted": database.clear_predictions()}
    except DatabaseError as exc:
        raise HTTPException(
            status_code=503, detail=f"Prediction history could not be cleared: {exc}"
        ) from exc
