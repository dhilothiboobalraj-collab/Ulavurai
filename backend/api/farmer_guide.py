from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator

from database import DatabaseError, PredictionDatabase, get_database
from schema import FEATURES
from services.predictor import PredictorError
from services.recommendation import recommendation_service
from api.prediction import PredictionInput
from services.farmer_crop_recommender import farmer_crop_recommender

router = APIRouter(prefix="/farmer-guide", tags=["farmer guide"])

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


class FarmerGuideSelections(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language: Literal["ta", "en"]
    district: str
    soil_choice: Literal["red_loam", "black", "clay", "sandy", "unknown"]
    water_choice: Literal["low", "medium", "high", "rainfed"]
    weather_problem: Literal[
        "delayed_rain", "heavy_rain", "heat_risk", "pest_risk", "normal"
    ]
    farmer_goal: Literal["safe", "profit", "low_water", "short_duration"]

    @field_validator("district")
    @classmethod
    def known_district(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TAMIL_NADU_DISTRICTS:
            raise ValueError("Choose a supported Tamil Nadu district.")
        return normalized


class FarmerGuideInput(FarmerGuideSelections):
    model_inputs: PredictionInput | None = None


@router.post("/recommend")
def farmer_basic_recommend(
    request: FarmerGuideSelections,
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    result = farmer_crop_recommender.recommend(
        district=request.district,
        soil_choice=request.soil_choice,
        water_choice=request.water_choice,
        weather_problem=request.weather_problem,
        farmer_goal=request.farmer_goal,
        language=request.language,
    )
    result.update(
        {
            "mode": "basic_farmer_recommendation",
            "model_prediction_available": False,
            "confidence": None,
            "risk_context": request.model_dump(),
        }
    )
    try:
        session_id = database.save_farmer_session(request.model_dump(), result)
    except DatabaseError as exc:
        raise HTTPException(
            status_code=503, detail=f"Farmer guide history could not be saved: {exc}"
        ) from exc
    return {
        "success": True,
        "interface_type": "easy_farmer",
        "session_id": session_id,
        **result,
    }


@router.post("/predict")
def farmer_predict(
    request: FarmerGuideInput,
    database: PredictionDatabase = Depends(get_database),
) -> dict:
    selections = request.model_dump(exclude={"model_inputs"})
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
            prediction = recommendation_service.recommend(
                request.model_inputs.model_dump()
            )
        except PredictorError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        result = {
            "mode": "ai_model_recommendation",
            "recommendation_type": "farmer_model",
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
        session_id = database.save_farmer_session(selections, result)
    except DatabaseError as exc:
        raise HTTPException(
            status_code=503, detail=f"Farmer guide history could not be saved: {exc}"
        ) from exc
    return {
        "success": True,
        "interface_type": "easy_farmer",
        "session_id": session_id,
        **result,
    }
