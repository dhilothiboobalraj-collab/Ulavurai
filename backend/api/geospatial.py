import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

if __package__.startswith("backend."):
    from backend.auth import require_authenticated_user
    from backend.services.local_soil_lookup import (
        SoilDatasetError,
        lookup_local_soil,
    )
    from backend.services.local_climate_lookup import (
        ClimateDatasetError,
        lookup_local_climate,
    )
    from backend.services.recent_weather_lookup import (
        RecentWeatherError,
        lookup_recent_weather,
    )
    from backend.services.location_name import lookup_location_name
    from backend.services.weather_lookup import lookup_current_weather
else:
    from auth import require_authenticated_user
    from services.local_soil_lookup import SoilDatasetError, lookup_local_soil
    from services.local_climate_lookup import ClimateDatasetError, lookup_local_climate
    from services.recent_weather_lookup import RecentWeatherError, lookup_recent_weather
    from services.location_name import lookup_location_name
    from services.weather_lookup import lookup_current_weather

router = APIRouter(prefix="/geospatial", tags=["geospatial"])
location_data_router = APIRouter(tags=["location data"])
logger = logging.getLogger(__name__)


class SoilLookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def reject_boolean_coordinates(cls, value: object) -> object:
        if isinstance(value, bool):
            raise ValueError("Coordinates must be numeric latitude/longitude values.")
        return value


@router.post("/soil-lookup")
def soil_lookup(
    request: SoilLookupRequest,
    _: str = Depends(require_authenticated_user),
) -> dict[str, Any]:
    try:
        return lookup_local_soil(request.latitude, request.longitude)
    except SoilDatasetError as exc:
        raise HTTPException(
            status_code=503,
            detail="The configured local soil dataset is unavailable or invalid.",
        ) from exc


@router.post("/local-lookup")
def local_lookup(
    request: SoilLookupRequest,
    _: str = Depends(require_authenticated_user),
) -> dict[str, Any]:
    soil = None
    soil_error = None
    try:
        soil = lookup_local_soil(request.latitude, request.longitude)
    except SoilDatasetError:
        soil_error = "The installed local soil dataset is unavailable or invalid."

    climate = None
    climate_error = None
    try:
        climate = lookup_local_climate(request.latitude, request.longitude)
    except ClimateDatasetError:
        climate_error = "The installed local climate dataset is unavailable or invalid."

    recent_weather = None
    recent_weather_error = None
    try:
        recent_weather = lookup_recent_weather(
            request.latitude,
            request.longitude,
        )
    except RecentWeatherError as exc:
        logger.warning("NASA POWER daily weather lookup failed: %s", exc)
        recent_weather_error = str(exc)

    return {
        "latitude": request.latitude,
        "longitude": request.longitude,
        "soil": soil,
        "soil_error": soil_error,
        "climate": climate,
        "climate_error": climate_error,
        "recent_weather": recent_weather,
        "recent_weather_error": recent_weather_error,
    }


@router.get("/climate-lookup")
def climate_lookup(
    latitude: float = Query(ge=-90, le=90, allow_inf_nan=False),
    longitude: float = Query(ge=-180, le=180, allow_inf_nan=False),
    _: str = Depends(require_authenticated_user),
) -> dict[str, Any]:
    try:
        coordinates = SoilLookupRequest(latitude=latitude, longitude=longitude)
        return lookup_local_climate(coordinates.latitude, coordinates.longitude)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail="Latitude or longitude is outside its valid range.",
        ) from exc
    except ClimateDatasetError as exc:
        raise HTTPException(
            status_code=503,
            detail="The installed local climate dataset is unavailable or invalid.",
        ) from exc


@location_data_router.get("/location-data")
def location_data(
    latitude: float = Query(ge=-90, le=90, allow_inf_nan=False),
    longitude: float = Query(ge=-180, le=180, allow_inf_nan=False),
    _: str = Depends(require_authenticated_user),
) -> dict[str, Any]:
    try:
        coordinates = SoilLookupRequest(latitude=latitude, longitude=longitude)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail="Latitude or longitude is outside its valid range.",
        ) from exc

    soil_error = None
    try:
        soil = lookup_local_soil(coordinates.latitude, coordinates.longitude)
    except SoilDatasetError:
        soil = None
        soil_error = "The local soil dataset is unavailable; weather context may still be available."

    weather = lookup_current_weather(
        coordinates.latitude,
        coordinates.longitude,
    )
    location_name = lookup_location_name(
        coordinates.latitude,
        coordinates.longitude,
    )
    return {
        "latitude": coordinates.latitude,
        "longitude": coordinates.longitude,
        "location_name": location_name,
        "soil": soil,
        "soil_error": soil_error,
        "weather": weather,
        "weather_model_inputs": {},
    }
