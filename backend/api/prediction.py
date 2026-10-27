import math
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

if __package__.startswith("backend."):
    from backend.auth import require_authenticated_user
    from backend.database import DatabaseError, PredictionDatabase, get_database
    from backend.services.predictor import PredictorError, get_predictor
else:
    from auth import require_authenticated_user
    from database import DatabaseError, PredictionDatabase, get_database
    from services.predictor import PredictorError, get_predictor

router = APIRouter(tags=["prediction"])
logger = logging.getLogger(__name__)


class PredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    N: float = Field(ge=0)
    P: float = Field(ge=0)
    K: float = Field(ge=0)
    temperature: float = Field(ge=-90, le=60)
    humidity: float = Field(ge=0, le=100)
    ph: float = Field(ge=0, le=14)
    rainfall: float = Field(ge=0)

    @field_validator(
        "N", "P", "K", "temperature", "humidity", "ph", "rainfall", mode="before"
    )
    @classmethod
    def require_numeric_values(cls, value: object) -> object:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("Values must be JSON numbers.")
        return value

    @field_validator("N", "P", "K", "temperature", "humidity", "ph", "rainfall")
    @classmethod
    def require_finite_values(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("Values must be finite numbers.")
        return value


class AdvisoryContext(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    district: str | None = Field(default=None, max_length=80)
    village: str | None = Field(default=None, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    season: Literal["kharif", "rabi", "summer", "year_round", "other"] | None = None
    crop_to_analyse: str | None = Field(default=None, max_length=40)
    farm_area_ha: float | None = Field(default=None, gt=0, le=1_000_000)
    soil_type: Literal["red_soil", "black_soil", "clay", "sandy", "other"] | None = None
    organic_carbon_pct: float | None = Field(default=None, ge=0, le=100)
    electrical_conductivity_ds_m: float | None = Field(default=None, ge=0, le=1_000)
    water_source: Literal[
        "rainfed", "canal", "borewell", "open_well", "tank", "other"
    ] | None = None
    irrigation_availability: Literal["available", "limited", "none", "unknown"] | None = None
    previous_crop: str | None = Field(default=None, max_length=40)
    market_price_per_quintal: float | None = Field(default=None, ge=0, le=1_000_000)
    farmer_objective: Literal[
        "safe", "profit", "low_water", "short_duration", "other"
    ] | None = None
    geospatial_estimate: dict[str, object] | None = None
    weather_context: dict[str, object] | None = None


class PredictionRequest(PredictionInput):
    advisory_context: AdvisoryContext | None = None


@router.post("/predict/preview")
def preview_prediction(
    request: PredictionInput,
    _: str = Depends(require_authenticated_user),
) -> dict:
    try:
        return {"success": True, **get_predictor().predict(request.model_dump())}
    except PredictorError as exc:
        logger.warning("Prediction preview unavailable: %s", exc)
        raise HTTPException(
            status_code=503, detail="The crop recommendation service is unavailable."
        ) from exc


@router.post("/predict")
def predict(
    request: PredictionRequest,
    user_id: str = Depends(require_authenticated_user),
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    try:
        values = request.model_dump(exclude={"advisory_context"})
        context = (
            request.advisory_context.model_dump(exclude_none=True)
            if request.advisory_context is not None
            else {}
        )
        result = get_predictor().predict(values)
        result["advisory_context"] = context
        database.save_prediction(
            values,
            result["best_crop"],
            result["recommendations"][0]["confidence"],
            user_id,
            context,
        )
        return {"success": True, **result}
    except PredictorError as exc:
        logger.warning("Prediction service unavailable: %s", exc)
        raise HTTPException(
            status_code=503, detail="The crop recommendation service is unavailable."
        ) from exc
    except DatabaseError as exc:
        logger.exception("Could not save prediction history.")
        raise HTTPException(
            status_code=503, detail="Prediction history could not be saved."
        ) from exc
