from fastapi import APIRouter, HTTPException

from backend.services.predictor import PredictorError, get_predictor

router = APIRouter(prefix="/model", tags=["model"])
crops_router = APIRouter(tags=["model"])


@router.get("/metrics")
def metrics() -> dict:
    try:
        return get_predictor().metrics
    except PredictorError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/features")
def features() -> dict:
    try:
        predictor = get_predictor()
        return {"features": predictor.feature_metadata}
    except PredictorError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/importance")
def importance() -> dict:
    try:
        predictor = get_predictor()
        return {"feature_importance": predictor.feature_importance}
    except PredictorError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@crops_router.get("/crops")
def crops() -> dict:
    try:
        predictor = get_predictor()
        return {"crops": predictor.crops}
    except PredictorError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
