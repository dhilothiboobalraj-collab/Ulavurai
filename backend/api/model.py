import logging

from fastapi import APIRouter, Depends, HTTPException

if __package__.startswith("backend."):
    from backend.auth import require_authenticated_user
    from backend.services.farmer_crop_recommender import farmer_crop_recommender
    from backend.services.predictor import PredictorError, get_predictor
else:
    from auth import require_authenticated_user
    from services.farmer_crop_recommender import farmer_crop_recommender
    from services.predictor import PredictorError, get_predictor

router = APIRouter(
    prefix="/model",
    tags=["model"],
    dependencies=[Depends(require_authenticated_user)],
)
crops_router = APIRouter(tags=["model"], dependencies=[Depends(require_authenticated_user)])
logger = logging.getLogger(__name__)


@router.get("/metrics")
def metrics() -> dict:
    try:
        return get_predictor().metrics
    except PredictorError as exc:
        logger.warning("Model metrics unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Model metrics are unavailable.") from exc


@router.get("/features")
def features() -> dict:
    try:
        predictor = get_predictor()
        return {"features": predictor.feature_metadata}
    except PredictorError as exc:
        logger.warning("Model features unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Model features are unavailable.") from exc


@router.get("/importance")
def importance() -> dict:
    try:
        predictor = get_predictor()
        return {"feature_importance": predictor.feature_importance}
    except PredictorError as exc:
        logger.warning("Model feature importance unavailable: %s", exc)
        raise HTTPException(
            status_code=503, detail="Model feature importance is unavailable."
        ) from exc


@crops_router.get("/crops")
def crops() -> dict:
    try:
        predictor = get_predictor()
        return {"crops": predictor.crops}
    except PredictorError as exc:
        logger.warning("Crop list unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="The crop list is unavailable.") from exc


@router.get("/crop-calendar")
def crop_calendar() -> dict:
    rules = farmer_crop_recommender.rules
    return {
        "source": rules["source"],
        "crops": rules["crops"],
        "note": (
            "Durations are source-table planning references, not region-specific "
            "sowing dates or fertilizer recommendations."
        ),
    }
