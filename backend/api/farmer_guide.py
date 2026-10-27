import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
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

    district: str
    issue: Literal[
        "low_rainfall",
        "heavy_rainfall",
        "low_fertility",
        "ph_issue",
        "pest_disease",
        "market_profit",
        "no_problem",
        "other",
    ]
    goal: Literal[
        "higher_yield",
        "low_water",
        "short_duration",
        "lower_investment",
        "higher_profit",
        "improve_soil_fertility",
    ]
    irrigation: Literal["rainfed", "limited", "reliable"] | None = None
    season: Literal["kharif", "rabi", "summer", "year_round"] | None = None
    sowing_month: int | None = Field(default=None, ge=1, le=12)
    soil_type: Literal["red_loam", "black", "clay", "sandy", "unknown"] | None = None
    issue_description: str | None = Field(default=None, max_length=240)

    @field_validator("district")
    @classmethod
    def known_district(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TAMIL_NADU_DISTRICTS:
            raise ValueError("Choose a supported Tamil Nadu district.")
        return normalized

    @field_validator("issue_description")
    @classmethod
    def clean_issue_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def require_other_description(self) -> "SimpleFarmerRecommendationInput":
        if self.issue == "other" and not self.issue_description:
            raise ValueError("Describe the other farming issue.")
        return self


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


@router.post("/crop-recommendations")
def simple_farmer_crop_recommendations(
    request: SimpleFarmerRecommendationInput,
    _: str = Depends(require_authenticated_user),
) -> dict:
    return farmer_crop_recommender.recommend_for_simple_inputs(
        district=request.district,
        issue=request.issue,
        goal=request.goal,
        irrigation=request.irrigation,
        season=request.season,
        sowing_month=request.sowing_month,
        soil_type=request.soil_type,
        issue_description=request.issue_description,
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
    except DatabaseError as exc:
        logger.exception("Could not save farmer guide history.")
        raise HTTPException(
            status_code=503, detail="Farmer guide history could not be saved."
        ) from exc
    return {
        "success": True,
        "interface_type": "easy_farmer",
        "session_id": session_id,
        **result,
    }
