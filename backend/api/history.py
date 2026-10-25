import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import require_authenticated_user
from backend.database import PredictionDatabase, get_database

router = APIRouter(
    prefix="/history",
    tags=["history"],
)
logger = logging.getLogger(__name__)


@router.get("")
def history(
    user_id: str = Depends(require_authenticated_user),
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    try:
        return {
            "predictions": database.list_predictions(user_id),
            "farmer_sessions": database.list_farmer_sessions(user_id),
        }
    except sqlite3.Error as exc:
        logger.exception("Prediction history is unavailable.")
        raise HTTPException(
            status_code=503, detail="Prediction history is unavailable."
        ) from exc


@router.delete("")
def clear_history(
    user_id: str = Depends(require_authenticated_user),
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    try:
        return {"deleted": database.clear_predictions(user_id)}
    except sqlite3.Error as exc:
        logger.exception("Could not clear prediction history.")
        raise HTTPException(
            status_code=503, detail="Prediction history could not be cleared."
        ) from exc
