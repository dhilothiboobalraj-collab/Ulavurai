import logging
import math
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

if __package__ and __package__.startswith("backend."):
    from backend.auth import require_authenticated_user
    from backend.database import DatabaseError, PredictionDatabase, get_database
    from backend.schema import FEATURES
    from backend.services.farmer_crop_recommender import farmer_crop_recommender
    from backend.services.location_estimate import (
        LocationEstimateError,
        get_location_estimate,
    )
    from backend.services.predictor import PredictorError, get_predictor
    from backend.api.prediction import PredictionInput
else:
    from auth import require_authenticated_user
    from database import DatabaseError, PredictionDatabase, get_database
    from schema import FEATURES
    from services.farmer_crop_recommender import farmer_crop_recommender
    from services.location_estimate import (
        LocationEstimateError,
        get_location_estimate,
    )
    from services.predictor import PredictorError, get_predictor
    from api.prediction import PredictionInput

router = APIRouter(prefix="/farmer-guide", tags=["farmer guide"])
logger = logging.getLogger(__name__)

LANGUAGES = ("ta", "en")
SOIL_CHOICES = ("red_loam", "black", "clay", "sandy", "unknown")
WATER_CHOICES = ("low", "medium", "high", "rainfed")
WEATHER_PROBLEMS = (
    "delayed_rain",
    "heavy_rain",
    "heat_risk",
    "pest_risk",
    "normal",
)
FARMER_GOALS = ("safe", "profit", "low_water", "short_duration")
TAMIL_NADU_DISTRICTS = {
    "ariyalur",
    "chengalpattu",
    "chennai",
    "coimbatore",
    "cuddalore",
    "dharmapuri",
    "dindigul",
    "erode",
    "kallakurichi",
    "kancheepuram",
    "kanyakumari",
    "karur",
    "krishnagiri",
    "madurai",
    "mayiladuthurai",
    "nagapattinam",
    "namakkal",
    "nilgiris",
    "perambalur",
    "pudukkottai",
    "ramanathapuram",
    "ranipet",
    "salem",
    "sivaganga",
    "tenkasi",
    "thanjavur",
    "theni",
    "thoothukudi",
    "tiruchirappalli",
    "tirunelveli",
    "tirupathur",
    "tiruppur",
    "tiruvallur",
    "tiruvannamalai",
    "tiruvarur",
    "vellore",
    "viluppuram",
    "virudhunagar",
}


class FarmerGuideInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    language: Literal["ta", "en"]
    district: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    soil_choice: Literal["red_loam", "black", "clay", "sandy", "unknown"]
    water_choice: Literal["low", "medium", "high", "rainfed"]
    weather_problem: Literal[
        "delayed_rain", "heavy_rain", "heat_risk", "pest_risk", "normal"
    ]
    farmer_goal: Literal["safe", "profit", "low_water", "short_duration"]
    model_inputs: PredictionInput | None = None

    @field_validator("district")
    @classmethod
    def known_district(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TAMIL_NADU_DISTRICTS:
            raise ValueError("Choose a supported Tamil Nadu district.")
        return normalized

    @model_validator(mode="after")
    def require_coordinate_pair(self) -> "FarmerGuideInput":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        return self


class SimpleFarmerRecommendationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    language: Literal["ta", "en"] = "en"
    free_text: str | None = Field(default=None, max_length=1000)
    district: str | None = None
    issue: Literal[
        "low_rainfall",
        "heavy_rainfall",
        "low_fertility",
        "ph_issue",
        "pest_disease",
        "market_profit",
        "no_problem",
        "other",
    ] | None = None
    goal: Literal[
        "higher_yield",
        "low_water",
        "short_duration",
        "lower_investment",
        "higher_profit",
        "improve_soil_fertility",
    ] | None = None
    irrigation: Literal["rainfed", "limited", "reliable"] | None = None
    irrigation_method: Literal[
        "drip", "sprinkler", "surface", "furrow", "other"
    ] | None = None
    season: Literal["kharif", "rabi", "summer", "year_round"] | None = None
    sowing_month: int | None = Field(default=None, ge=1, le=12)
    soil_type: Literal["red_loam", "black", "clay", "sandy", "unknown"] | None = None
    affected_crop: str | None = Field(default=None, max_length=80)
    issue_description: str | None = Field(default=None, max_length=240)
    model_measurements: dict[str, float] | None = None

    @field_validator("model_measurements", mode="before")
    @classmethod
    def validate_model_measurements(
        cls, value: object
    ) -> dict[str, float] | None:
        if value is None:
            return None
        if not isinstance(value, dict):
            raise ValueError("Model measurements must be an object.")
        measurement_fields = {
            "N": (0, None),
            "P": (0, None),
            "K": (0, None),
            "temperature": (-90, 60),
            "humidity": (0, 100),
            "ph": (0, 14),
            "rainfall": (0, None),
            "electrical_conductivity_ds_m": (0, 1000),
            "organic_carbon_pct": (0, 100),
        }
        unknown = set(value) - measurement_fields.keys()
        if unknown:
            raise ValueError(f"Unknown model measurement fields: {sorted(unknown)}")
        normalized: dict[str, float] = {}
        for field, measured_value in value.items():
            if (
                isinstance(measured_value, bool)
                or not isinstance(measured_value, (int, float))
            ):
                raise ValueError(f"{field} must be a finite JSON number.")
            try:
                measured_number = float(measured_value)
            except OverflowError as exc:
                raise ValueError(f"{field} must be a finite JSON number.") from exc
            if not math.isfinite(measured_number):
                raise ValueError(f"{field} must be a finite JSON number.")
            minimum, maximum = measurement_fields[field]
            if measured_number < minimum or (
                maximum is not None and measured_number > maximum
            ):
                raise ValueError(f"{field} is outside the supported input range.")
            normalized[field] = measured_number
        return normalized

    @field_validator("district")
    @classmethod
    def known_district(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().lower()
        if normalized not in TAMIL_NADU_DISTRICTS:
            raise ValueError("Choose a supported Tamil Nadu district.")
        return normalized

    @field_validator("free_text")
    @classmethod
    def clean_free_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("issue_description")
    @classmethod
    def clean_issue_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("affected_crop")
    @classmethod
    def clean_affected_crop(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def require_some_input(self) -> "SimpleFarmerRecommendationInput":
        has_structured_input = any((
            self.district, self.issue, self.goal, self.irrigation,
            self.irrigation_method, self.season,
            self.sowing_month, self.soil_type, self.issue_description,
            self.affected_crop,
        ))
        if not has_structured_input and not self.free_text:
            raise ValueError("Provide farm details or describe your farm.")
        if not self.free_text and self.issue in {"other", "pest_disease"} and not self.issue_description:
            raise ValueError("Describe the farming issue or pest/disease symptoms.")
        if not self.free_text and self.issue == "pest_disease" and not self.affected_crop:
            raise ValueError("Name the crop affected by the pest or disease.")
        return self


class FarmerCropRecommendationItem(BaseModel):
    rank: int = Field(ge=1, le=3)
    crop: str
    name_en: str
    name_ta: str
    classification: Literal["conditionally_suitable"] = "conditionally_suitable"
    relative_match_score: float = Field(ge=0, le=100)
    water_requirement_mm: float | None = Field(default=None, gt=0)
    water_requirement_class: Literal["low", "medium", "high", "not_assessed"] | None = None
    duration_days: float | None = Field(default=None, gt=0)
    reasons: list[str]
    score_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    reason_text: list[str]
    seasonal_suitability: Literal["not_assessed"]
    risks: list[str]
    source: dict[str, Any]
    evidence_notes: list[str] = Field(default_factory=list)
    crop_sources: list[dict[str, Any]] = Field(default_factory=list)
    sowing_window_evidence: list[dict[str, Any]] = Field(default_factory=list)


class FarmerCropRecommendationResponse(BaseModel):
    """Stable response for ranked, clarification, unsupported, and withheld requests."""

    status: Literal[
        "relative_advisory",
        "insufficient_data",
        "clarification_required",
        "unsupported_request",
    ]
    method: str
    confidence: Literal["low", "not_assessed"]
    district: str
    issue: str
    goal: str
    selected_context: dict[str, Any]
    parsed_conditions: dict[str, Any]
    recommendations: list[FarmerCropRecommendationItem]
    questions: list[str] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str]
    source: dict[str, Any]
    advisory_only: bool
    message: str
    analysis: dict[str, Any] | None = None
    farming_guide: list[str] = Field(default_factory=list)


class FarmerCropRecommendationError(BaseModel):
    status: Literal["error"] = "error"
    code: str
    message: str
    errors: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/location-estimate")
def farmer_location_estimate(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    _: str = Depends(require_authenticated_user),
) -> dict:
    try:
        return get_location_estimate(latitude, longitude)
    except LocationEstimateError as exc:
        logger.warning("Location estimate unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Local soil data is unavailable. You can still enter measurements manually.",
        ) from exc


@router.post(
    "/crop-recommendations",
    response_model=FarmerCropRecommendationResponse,
    responses={
        422: {
            "description": "Invalid farmer input",
            "model": FarmerCropRecommendationError,
        },
        500: {
            "description": "Recommendation engine failure",
            "model": FarmerCropRecommendationError,
        },
    },
)
def simple_farmer_crop_recommendations(
    request: SimpleFarmerRecommendationInput,
    _: str = Depends(require_authenticated_user),
) -> dict:
    try:
        result = farmer_crop_recommender.analyze_farm_and_recommend_crops(
            free_text=request.free_text,
        district=request.district,
        issue=request.issue,
        goal=request.goal,
        irrigation=request.irrigation,
        irrigation_method=request.irrigation_method,
        season=request.season,
        sowing_month=request.sowing_month,
        soil_type=request.soil_type,
        issue_description=request.issue_description,
        affected_crop=request.affected_crop,
        model_measurements=request.model_measurements,
        language=request.language,
    )
        logger.info(
            "Farmer crop analysis completed: status=%s district=%s method=%s",
            result.get("status"), result.get("district"), result.get("method"),
        )
        return result
    except (KeyError, TypeError, ValueError, RuntimeError) as exc:
        logger.exception("Farmer crop recommendation failed")
        return JSONResponse(
            status_code=500,
            content=FarmerCropRecommendationError(
                code="recommendation_failed",
                message="Crop recommendation could not be completed. Please retry or contact support.",
            ).model_dump(),
        )


@router.post("/predict")
def farmer_predict(
    request: FarmerGuideInput,
    user_id: str = Depends(require_authenticated_user),
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    selections = request.model_dump(exclude={"model_inputs"})
    field_location = (
        {"latitude": request.latitude, "longitude": request.longitude}
        if request.latitude is not None and request.longitude is not None
        else None
    )
    result: dict

    if request.model_inputs is None:
        result = {
            "mode": "farmer_situation_guidance",
            "model_prediction_available": False,
            "best_crop": None,
            "confidence": None,
            "recommendations": [],
            "crop_categories": {
                "safe_crop": None,
                "income_crop": None,
                "backup_crop": None,
                "status": "not_available",
            },
            "risk_context": {
                "water_choice": request.water_choice,
                "weather_problem": request.weather_problem,
                "district": request.district,
                "soil_choice": request.soil_choice,
                "farmer_goal": request.farmer_goal,
                "district_profile_available": False,
                "field_location": field_location,
            },
            "message": {
                "ta": (
                    "மண் பரிசோதனை மதிப்புகள் மற்றும் தற்போதைய வானிலை அளவுகள் "
                    "இல்லாததால் பயிரை நம்பகமாகத் தேர்வு செய்ய முடியவில்லை. "
                    "மாவட்டம் அல்லது மண் வகையை மட்டும் வைத்து N, P, K, pH, "
                    "வெப்பநிலை, ஈரப்பதம் அல்லது மழையை நாங்கள் கணிக்கவில்லை."
                ),
                "en": (
                    "A crop cannot be recommended reliably without soil-test "
                    "values and measured weather inputs. We do not infer N, P, K, "
                    "pH, temperature, humidity, or rainfall from district or soil type."
                ),
            }[request.language],
            "missing_model_inputs": list(FEATURES),
        }
    else:
        try:
            prediction = get_predictor().predict(request.model_inputs.model_dump())
        except PredictorError as exc:
            logger.warning("Farmer guide prediction service unavailable: %s", exc)
            raise HTTPException(
                status_code=503, detail="The crop recommendation service is unavailable."
            ) from exc
        result = {
            "mode": "ai_model_recommendation",
            "model_prediction_available": True,
            "best_crop": prediction["best_crop"],
            "confidence": prediction["recommendations"][0]["confidence"],
            "recommendations": prediction["recommendations"],
            "crop_categories": {
                "safe_crop": None,
                "income_crop": None,
                "backup_crop": None,
                "status": "not_supported_by_model",
            },
            "risk_context": {
                "water_choice": request.water_choice,
                "weather_problem": request.weather_problem,
                "district": request.district,
                "soil_choice": request.soil_choice,
                "farmer_goal": request.farmer_goal,
                "district_profile_available": False,
                "field_location": field_location,
            },
            "message": {
                "ta": (
                    "இந்த பயிர் தேர்வு ஏழு மண் மற்றும் வானிலை அளவுகளின் "
                    "Random Forest கணிப்பிலிருந்து வந்தது. மாவட்டம், மண் வகை, "
                    "தண்ணீர், பிரச்சனை, இலக்கு ஆகியவை ஆலோசனைச் சூழலாக மட்டுமே "
                    "பதிவாகின்றன."
                ),
                "en": (
                    "This crop ranking comes from the Random Forest using the "
                    "seven supplied soil and weather measurements. District, "
                    "soil type, water, problem, and goal are recorded as context only."
                ),
            }[request.language],
            "missing_model_inputs": [],
            "soil_analysis": prediction["soil_analysis"],
            "environment_analysis": prediction["environment_analysis"],
            "warnings": prediction["warnings"],
        }

    try:
        session_id = database.save_farmer_session(selections, result, user_id)
    except DatabaseError:
        logger.warning("Farmer guide result generated but history could not be saved.")
        return {
            "success": True,
            "interface_type": "easy_farmer",
            "session_id": None,
            "history_saved": False,
            "warnings": [
                "The guidance was generated, but could not be saved to history."
            ],
            **result,
        }
    return {
        "success": True,
        "interface_type": "easy_farmer",
        "session_id": session_id,
        "history_saved": True,
        **result,
    }
