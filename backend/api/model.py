<<<<<<< HEAD
import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import require_authenticated_user
from backend.services.predictor import PredictorError, get_predictor

router = APIRouter(
    prefix="/model",
    tags=["model"],
    dependencies=[Depends(require_authenticated_user)],
)
crops_router = APIRouter(tags=["model"], dependencies=[Depends(require_authenticated_user)])
logger = logging.getLogger(__name__)
=======
from fastapi import APIRouter, HTTPException

from services.predictor import PredictorError, get_predictor

router = APIRouter(prefix="/model", tags=["model"])
crops_router = APIRouter(tags=["model"])
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e


@router.get("/metrics")
def metrics() -> dict:
    try:
        return get_predictor().metrics
    except PredictorError as exc:
<<<<<<< HEAD
        logger.warning("Model metrics unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Model metrics are unavailable.") from exc
=======
        raise HTTPException(status_code=503, detail=str(exc)) from exc
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e


@router.get("/features")
def features() -> dict:
    try:
        predictor = get_predictor()
        return {"features": predictor.feature_metadata}
    except PredictorError as exc:
<<<<<<< HEAD
        logger.warning("Model features unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Model features are unavailable.") from exc
=======
        raise HTTPException(status_code=503, detail=str(exc)) from exc
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e


@router.get("/importance")
def importance() -> dict:
    try:
        predictor = get_predictor()
        return {"feature_importance": predictor.feature_importance}
    except PredictorError as exc:
<<<<<<< HEAD
        logger.warning("Model feature importance unavailable: %s", exc)
        raise HTTPException(
            status_code=503, detail="Model feature importance is unavailable."
        ) from exc
=======
        raise HTTPException(status_code=503, detail=str(exc)) from exc
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e


@crops_router.get("/crops")
def crops() -> dict:
    try:
        predictor = get_predictor()
        return {"crops": predictor.crops}
    except PredictorError as exc:
<<<<<<< HEAD
        logger.warning("Crop list unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="The crop list is unavailable.") from exc
=======
        raise HTTPException(status_code=503, detail=str(exc)) from exc
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
