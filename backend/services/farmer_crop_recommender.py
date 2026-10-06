from __future__ import annotations

import json
from pathlib import Path
from typing import Any

RULES_PATH = Path(__file__).resolve().parents[1] / "data" / "farmer_crop_rules.json"


class FarmerCropRecommender:
    def __init__(self, rules_path: Path = RULES_PATH) -> None:
        self.rules_path = rules_path
        self.rules = self._load_rules()

    def _load_rules(self) -> dict[str, Any]:
        try:
            rules = json.loads(self.rules_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(
                f"Could not load basic farmer crop rules from {self.rules_path}: {exc}"
            ) from exc

        if not isinstance(rules, dict) or not isinstance(rules.get("crops"), list):
            raise ValueError(f"Invalid basic farmer crop rules: {self.rules_path}")
        if len(rules["crops"]) < 3:
            raise ValueError("At least three sourced crop rules are required.")
        return rules

    def recommend(
        self,
        *,
        district: str,
        soil_choice: str,
        water_choice: str,
        weather_problem: str,
        farmer_goal: str,
        language: str,
    ) -> dict[str, Any]:
        crops = self.rules["crops"]
        water_values = [float(crop["water_requirement_mm"]) for crop in crops]
        duration_values = [float(crop["duration_days"]) for crop in crops]
        water_range = (min(water_values), max(water_values))
        duration_range = (min(duration_values), max(duration_values))
        weights = self.rules["scoring"]["weights"]
        ranked = []

        for crop in crops:
            water_score = self._water_score(
                float(crop["water_requirement_mm"]), water_range, water_choice
            )
            factors = [
                {
                    "name": "water_availability",
                    "score": water_score,
                    "weight": float(weights["water_availability"]),
                }
            ]

            goal_score = self._supported_goal_score(
                crop, water_range, duration_range, farmer_goal
            )
            if goal_score is not None:
                factors.append(
                    {
                        "name": "farmer_goal",
                        "score": goal_score,
                        "weight": float(weights["supported_goal"]),
                    }
                )

            total_weight = sum(factor["weight"] for factor in factors)
            match_score = sum(
                factor["score"] * factor["weight"] for factor in factors
            ) / total_weight
            ranked.append(
                {
                    **crop,
                    "rule_match_score": round(match_score * 100, 1),
                    "score_breakdown": factors,
                }
            )

        ranked.sort(
            key=lambda crop: (
                -crop["rule_match_score"],
                crop["water_requirement_mm"],
                crop["duration_days"],
                crop["crop"],
            )
        )
        recommendations = [
            {
                "rank": rank,
                **crop,
                "reasons": self._reasons(crop["score_breakdown"]),
                "source": self.rules["source"],
            }
            for rank, crop in enumerate(ranked[:3], start=1)
        ]
        return {
            "recommendation_type": "basic_farmer",
            "method": "tnau_source_based_relative_rule_ranking",
            "recommended_crop": recommendations[0]["crop"],
            "best_crop": recommendations[0]["crop"],
            "rule_match_score": recommendations[0]["rule_match_score"],
            "recommendations": recommendations,
            "alternatives": recommendations[1:],
            "water_requirement_class": self._water_class(
                recommendations[0]["water_requirement_mm"], water_values
            ),
            "source": self.rules["source"],
            "district": district,
            "district_used_for_ranking": False,
            "soil_used_for_ranking": False,
            "problem_used_for_ranking": False,
            "goal_used_for_ranking": farmer_goal in {"low_water", "short_duration"},
            "message": self._message(
                language, soil_choice, farmer_goal, weather_problem
            ),
            "limitations": self._limitations(
                language, soil_choice, farmer_goal, weather_problem
            ),
        }

    @staticmethod
    def _scale(value: float, value_range: tuple[float, float]) -> float:
        minimum, maximum = value_range
        if maximum == minimum:
            return 0.5
        return (value - minimum) / (maximum - minimum)

    def _water_score(
        self,
        requirement: float,
        value_range: tuple[float, float],
        availability: str,
    ) -> float:
        relative_need = self._scale(requirement, value_range)
        if availability in {"low", "rainfed"}:
            return 1 - relative_need
        if availability == "high":
            return relative_need
        return 1 - abs(relative_need - 0.5) * 2

    def _supported_goal_score(
        self,
        crop: dict[str, Any],
        water_range: tuple[float, float],
        duration_range: tuple[float, float],
        goal: str,
    ) -> float | None:
        if goal == "low_water":
            return 1 - self._scale(
                float(crop["water_requirement_mm"]), water_range
            )
        if goal == "short_duration":
            return 1 - self._scale(float(crop["duration_days"]), duration_range)
        return None

    def _water_class(self, requirement: float, values: list[float]) -> str:
        ordered = sorted(values)
        low_cutoff = ordered[len(ordered) // 3]
        high_cutoff = ordered[(2 * len(ordered)) // 3]
        if requirement <= low_cutoff:
            return "low"
        if requirement <= high_cutoff:
            return "medium"
        return "high"

    @staticmethod
    def _reasons(factors: list[dict[str, Any]]) -> list[str]:
        return [factor["name"] for factor in factors]

    @staticmethod
    def _message(
        language: str, soil_choice: str, goal: str, problem: str
    ) -> str:
        if language == "ta":
            if problem == "pest_risk":
                problem_note = (
                    " நீங்கள் பூச்சி பிரச்சனை இருப்பதாகத் தெரிவித்துள்ளீர்கள்; "
                    "இந்த அமைப்பு பூச்சி அல்லது நோயைக் கண்டறியாது."
                )
            else:
                problem_note = ""
            soil_note = (
                " தேர்ந்தெடுத்த மண் வகைக்கு ஆதாரமுள்ள பொருத்தத் தரவு இல்லை."
                if soil_choice != "unknown"
                else " மண் தெரியாததால் மண் பொருத்தம் கணக்கிடப்படவில்லை."
            )
            goal_note = (
                " வருமானம் அல்லது பாதுகாப்பு இலக்கை இந்தத் தரவு மதிப்பிடாது."
                if goal in {"profit", "safe"}
                else ""
            )
            return (
                "இது TNAU நீர் தேவை அட்டவணையை ஒப்பிட்டு வழங்கும் அடிப்படை "
                "விவசாயி தகவல் பரிந்துரை; Random Forest கணிப்பு அல்ல."
                + soil_note
                + goal_note
                + problem_note
                + " மாவட்டம் முடிவை மாற்றவில்லை."
            )

        if problem == "pest_risk":
            problem_note = (
                " You reported a pest problem; this system does not detect pests "
                "or diseases."
            )
        else:
            problem_note = ""
        soil_note = (
            " No source-backed soil compatibility rule is available for the "
            "selected soil."
            if soil_choice != "unknown"
            else " Soil compatibility was not scored because the soil is unknown."
        )
        goal_note = (
            " The available rules do not assess income or safety."
            if goal in {"profit", "safe"}
            else ""
        )
        return (
            "This basic farmer recommendation is a relative ranking from TNAU "
            "water-requirement data, not a Random Forest prediction."
            + soil_note
            + goal_note
            + problem_note
            + " District did not change the ranking."
        )

    @staticmethod
    def _limitations(
        language: str, soil_choice: str, goal: str, problem: str
    ) -> list[str]:
        if language == "ta":
            limitations = [
                "மாவட்டத்திற்கான பயிர் விதிகள் இல்லை; மாவட்டம் பதிவு மட்டுமே செய்யப்பட்டது.",
                "மண் வகை வாரியான ஆதாரப் பொருத்த விதிகள் இல்லை; மண் மதிப்பெண்ணில் சேர்க்கப்படவில்லை.",
                "தற்போதைய பிரச்சனைக்கு பயிர் பொருத்த விதிகள் இல்லை; இது கண்டறிதல் அல்ல.",
                "நீர் மதிப்புகள் TNAU-வின் மேற்பரப்பு பாசன அட்டவணையிலிருந்து; உள்ளூர் நீர் அளவாக கருத வேண்டாம்.",
            ]
            if goal in {"profit", "safe"}:
                limitations.append(
                    "வருமானம் அல்லது பாதுகாப்பு இலக்கிற்கு ஆதாரமுள்ள தரவு இல்லை; அது மதிப்பெண்ணில் சேர்க்கப்படவில்லை."
                )
            if soil_choice == "unknown":
                limitations.append(
                    "மண் தகவல் இல்லாததால் பரிந்துரையின் முழுமை குறையலாம்."
                )
            if problem == "pest_risk":
                limitations.append(
                    "பூச்சி/நோய் கண்டறிதல் இல்லை; உள்ளூர் வேளாண்மை நிபுணரை அணுகவும்."
                )
            return limitations

        limitations = [
            "No district-specific crop rules are included; district is recorded only.",
            "No source-backed soil-category compatibility rules are included or scored.",
            "No crop compatibility rule for the reported problem is included; this is not detection.",
            "Water values come from TNAU's surface-irrigation table and are not local water measurements.",
        ]
        if goal in {"profit", "safe"}:
            limitations.append(
                "No source-backed income or safety rule is available; this goal was not scored."
            )
        if soil_choice == "unknown":
            limitations.append(
                "Soil information is unavailable, so recommendation context is limited."
            )
        if problem == "pest_risk":
            limitations.append(
                "Pest/disease detection is not provided; consult a local agriculture expert."
            )
        return limitations


farmer_crop_recommender = FarmerCropRecommender()
