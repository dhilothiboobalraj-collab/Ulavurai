from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

RULES_PATH = Path(__file__).resolve().parents[1] / "data" / "farmer_crop_rules.json"
DISTRICTS = {
    "ariyalur", "chengalpattu", "chennai", "coimbatore", "cuddalore",
    "dharmapuri", "dindigul", "erode", "kallakurichi", "kancheepuram",
    "kanyakumari", "karur", "krishnagiri", "madurai", "mayiladuthurai",
    "nagapattinam", "namakkal", "nilgiris", "perambalur", "pudukkottai",
    "ramanathapuram", "ranipet", "salem", "sivaganga", "tenkasi",
    "thanjavur", "theni", "thoothukudi", "tiruchirappalli", "tirunelveli",
    "tirupathur", "tiruppur", "tiruvallur", "tiruvannamalai", "tiruvarur",
    "vellore", "viluppuram", "virudhunagar",
}
TAMIL_DISTRICTS = {
    "அரியலூர்": "ariyalur", "செங்கல்பட்டு": "chengalpattu", "சென்னை": "chennai",
    "கோயம்புத்தூர்": "coimbatore", "கடலூர்": "cuddalore", "தர்மபுரி": "dharmapuri",
    "திண்டுக்கல்": "dindigul", "ஈரோடு": "erode", "கள்ளக்குறிச்சி": "kallakurichi",
    "காஞ்சிபுரம்": "kancheepuram", "கன்னியாகுமரி": "kanyakumari", "கரூர்": "karur",
    "கிருஷ்ணகிரி": "krishnagiri", "மதுரை": "madurai", "மயிலாடுதுறை": "mayiladuthurai",
    "நாகப்பட்டினம்": "nagapattinam", "நாமக்கல்": "namakkal", "நீலகிரி": "nilgiris",
    "பெரம்பலூர்": "perambalur", "புதுக்கோட்டை": "pudukkottai", "இராமநாதபுரம்": "ramanathapuram",
    "ராணிப்பேட்டை": "ranipet", "சேலம்": "salem", "சிவகங்கை": "sivaganga",
    "தென்காசி": "tenkasi", "தஞ்சாவூர்": "thanjavur", "தேனி": "theni",
    "தூத்துக்குடி": "thoothukudi", "திருச்சிராப்பள்ளி": "tiruchirappalli",
    "திருநெல்வேலி": "tirunelveli", "திருப்பத்தூர்": "tirupathur", "திருப்பூர்": "tiruppur",
    "திருவள்ளூர்": "tiruvallur", "திருவண்ணாமலை": "tiruvannamalai", "திருவாரூர்": "tiruvarur",
    "வேலூர்": "vellore", "விழுப்புரம்": "viluppuram",
}
CROP_NAMES_TA = {
    "rice": "நெல்", "sugarcane": "கரும்பு", "groundnut": "நிலக்கடலை",
    "sorghum": "சோளம்", "maize": "மக்காச்சோளம்", "ragi": "கேழ்வரகு",
    "cotton": "பருத்தி", "blackgram": "உளுந்து", "soybean": "சோயாபீன்",
    "sesame": "எள்", "sunflower": "சூரியகாந்தி",
    "cowpea": "காராமணி", "redgram": "துவரை",
}
MONTHS = {
    "january": 1, "jan": 1, "பிப்ரவரி": 2, "february": 2, "feb": 2,
    "மார்ச்": 3, "march": 3, "mar": 3, "ஏப்ரல்": 4, "april": 4, "apr": 4,
    "மே": 5, "மே மாதம்": 5, "may": 5, "ஜூன்": 6, "june": 6, "jun": 6,
    "ஜூலை": 7, "july": 7, "jul": 7, "ஆகஸ்ட்": 8, "august": 8, "aug": 8,
    "செப்டம்பர்": 9, "செப்டம்பரில்": 9, "september": 9, "sep": 9, "செப்டெம்பர்": 9,
    "அக்டோபர்": 10, "october": 10, "oct": 10, "நவம்பர்": 11,
    "november": 11, "nov": 11, "டிசம்பர்": 12, "december": 12, "dec": 12,
    "ஜனவரி": 1,
}
PEST_SYMPTOM_TERMS = (
    "spots", "yellow", "wilting", "lesion", "holes", "mold", "rot",
    "curl", "streak", "discolor", "புள்ளி", "மஞ்சள்", "வாடுதல்",
    "சுருண்ட", "கருக", "அழுக",
)
SEASON_MONTHS = {
    "kharif": frozenset({6, 7, 8, 9}),
    "rabi": frozenset({10, 11, 12, 1}),
    "summer": frozenset({2, 3, 4, 5}),
    "year_round": frozenset(range(1, 13)),
}


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
        crops = [
            crop for crop in self.rules["crops"]
            if crop.get("water_requirement_mm") is not None
            and crop.get("duration_days") is not None
        ]
        water_values = [
            float(crop["water_requirement_mm"])
            for crop in crops
            if crop.get("water_requirement_mm") is not None
        ]
        duration_values = [
            float(crop["duration_days"])
            for crop in crops
            if crop.get("duration_days") is not None
        ]
        water_range = (min(water_values), max(water_values))
        duration_range = (min(duration_values), max(duration_values))
        high_rainfall_blocks_ranking = weather_problem == "heavy_rain"
        ranked = []

        for crop in crops:
            water_score = self._water_score(
                float(crop["water_requirement_mm"]), water_range, water_choice
            )
            goal_score = self._supported_goal_score(
                crop, water_range, duration_range, farmer_goal
            )
            primary_factor = (
                "farmer_goal"
                if goal_score is not None
                and (
                    farmer_goal == "short_duration"
                    or water_score is None
                )
                else "water_availability"
            )
            primary_score = (
                goal_score if primary_factor == "farmer_goal" else water_score
            )
            secondary_score = (
                water_score
                if primary_factor == "farmer_goal"
                else goal_score if farmer_goal == "short_duration" else None
            )
            factors = [{
                "name": primary_factor,
                "score": primary_score,
                "role": "primary",
            }]
            if secondary_score is not None and not high_rainfall_blocks_ranking:
                factors.append({
                    "name": (
                        "water_availability"
                        if primary_factor == "farmer_goal"
                        else "farmer_goal"
                    ),
                    "score": secondary_score,
                    "role": "secondary",
                })
            if primary_score is None:
                continue
            ranked.append(
                {
                    **crop,
                    "rule_match_score": round(primary_score * 100, 1),
                    "score_breakdown": factors,
                    "secondary_score": secondary_score,
                }
            )

        ranked.sort(
            key=lambda crop: (
                -crop["rule_match_score"],
                -(crop["secondary_score"] if crop["secondary_score"] is not None else -1),
                crop["crop"],
            )
        )
        if not ranked:
            raise ValueError(
                "The installed crop evidence does not support this water and goal selection."
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

    def analyze_farm_and_recommend_crops(
        self,
        *,
        free_text: str | None = None,
        district: str | None = None,
        issue: str | None = None,
        goal: str | None = None,
        irrigation: str | None = None,
        irrigation_method: str | None = None,
        season: str | None = None,
        sowing_month: int | None = None,
        soil_type: str | None = None,
        issue_description: str | None = None,
        affected_crop: str | None = None,
        model_measurements: dict[str, float] | None = None,
        language: str = "en",
    ) -> dict[str, Any]:
        parsed = self._parse_farm_text(free_text or "")
        submitted = {
            "district": district,
            "issue": issue,
            "goal": goal,
            "irrigation": irrigation,
            "irrigation_method": irrigation_method,
            "season": season,
            "sowing_month": sowing_month,
            "soil_type": soil_type,
        }
        conflicts = []
        merged: dict[str, Any] = {}
        for field, selected in submitted.items():
            extracted = parsed.get(field)
            if selected is not None and extracted is not None and selected != extracted:
                if field != "issue" or (
                    selected == "no_problem"
                    or extracted == "no_problem"
                    or {selected, extracted} == {"low_rainfall", "heavy_rainfall"}
                ):
                    conflicts.append(field)
            merged[field] = selected if selected is not None else extracted

        if parsed.get("conflicts"):
            conflicts.extend(parsed["conflicts"])
        merged["district"] = merged["district"] or "not_provided"
        merged["soil_type"] = merged["soil_type"] or "unknown"
        merged["issue_description"] = issue_description or parsed.get("issue_description")
        merged["affected_crop"] = affected_crop or parsed.get("affected_crop")
        resolved_issue = merged["issue"] or parsed.get("issue") or (
            "heavy_rainfall" if parsed.get("rainfall") == "excess"
            else "low_rainfall" if parsed.get("rainfall") == "low"
            else "not_provided"
        )
        resolved_goal = merged["goal"] or parsed.get("goal")
        season_month_conflict = bool(
            merged["season"]
            and merged["sowing_month"]
            and merged["sowing_month"] not in SEASON_MONTHS[merged["season"]]
        )
        parsed_conditions = {
            "district": merged["district"],
            "soil_type": merged["soil_type"],
            "rainfall": parsed.get("rainfall") if parsed.get("rainfall") != "not_provided" else (
                "low" if resolved_issue == "low_rainfall"
                else "excess" if resolved_issue == "heavy_rainfall"
                else "not_provided"
            ),
            "irrigation": merged["irrigation"] or "not_provided",
            "sowing_month": merged["sowing_month"],
            "season": merged["season"] or "not_provided",
            "season_month_consistency": (
                "conflict" if season_month_conflict
                else "consistent" if merged["season"] and merged["sowing_month"]
                else "not_assessed"
            ),
            "issue": resolved_issue,
            "goal": resolved_goal or "not_provided",
            "irrigation_method": merged["irrigation_method"] or "not_provided",
            "affected_crop": merged["affected_crop"],
            "issue_description": merged["issue_description"],
        }
        input_usage: dict[str, dict[str, Any]] = {}

        def record_input(name: str, value: Any) -> None:
            is_provided = value is not None and value not in {
                "",
                "unknown",
                "not_provided",
            }
            input_usage[name] = {
                "status": "recorded_but_unscored" if is_provided else "missing_or_unknown",
                "scoring_factors": [],
            }

        for field in (
            "district",
            "soil_type",
            "irrigation",
            "irrigation_method",
            "season",
            "sowing_month",
            "issue",
            "goal",
        ):
            record_input(field, parsed_conditions[field])
        record_input("rainfall", parsed_conditions["rainfall"])
        record_input("free_text", free_text)
        measurement_usage_fields = {
            "N": "N",
            "P": "P",
            "K": "K",
            "temperature": "temperature",
            "humidity": "humidity",
            "soil_ph": "ph",
            "measured_rainfall_mm": "rainfall",
            "electrical_conductivity_ds_m": "electrical_conductivity_ds_m",
            "organic_carbon_pct": "organic_carbon_pct",
        }
        for field, measurement_field in measurement_usage_fields.items():
            record_input(
                field,
                (model_measurements or {}).get(measurement_field),
            )
        if resolved_issue == "heavy_rainfall" or parsed.get("rainfall") == "excess":
            input_usage["issue"] = {
                "status": "scored",
                "scoring_factors": ["flood_risk_eligibility_gate"],
            }
            if parsed.get("rainfall") == "excess":
                input_usage["rainfall"] = {
                    "status": "scored",
                    "scoring_factors": ["flood_risk_eligibility_gate"],
                }
        base = {
            "method": "deterministic_tnau_source_rules",
            "confidence": "not_assessed",
            "district": merged["district"],
            "issue": resolved_issue,
            "goal": resolved_goal or "not_provided",
            "selected_context": {
                "irrigation": merged["irrigation"],
                "irrigation_method": merged["irrigation_method"],
                "season": merged["season"],
                "sowing_month": merged["sowing_month"],
                "soil_type": merged["soil_type"],
                "issue_description": merged["issue_description"],
                "affected_crop": merged["affected_crop"],
                "free_text": free_text,
                **(
                    {"model_measurements": model_measurements}
                    if model_measurements
                    else {}
                ),
            },
            "parsed_conditions": parsed_conditions,
            "recommendations": [],
            "questions": [],
            "assumptions": [],
            "analysis": {
                "measurement_values_recorded": bool(model_measurements),
                "measurement_values_used_for_ranking": False,
                "input_usage": input_usage,
            },
            "limitations": [
                "District, soil, sowing-month, and season suitability are not assessed by the installed crop source.",
                "Rainfall is qualitative when reported in text; no measured local rainfall is used.",
                "Crop-specific farming instructions, prices, yields, and fertilizer rates are not in the source dataset.",
            ],
            "source": self.rules["source"],
            "advisory_only": True,
        }
        if model_measurements:
            base["analysis"]["measurement_values_recorded"] = True
            base["analysis"]["measurement_values_used_for_ranking"] = False
            base["limitations"].append("model_measurements_not_scored")

        if conflicts:
            conflict_labels = {
                "district": "மாவட்டம்",
                "soil_type": "மண் வகை",
                "irrigation": "பாசனம்",
                "sowing_month": "விதைப்பு மாதம்",
                "season": "பருவம்",
                "issue": "பிரச்சினை",
                "goal": "இலக்கு",
                "irrigation_method": "பாசன முறை",
            }
            questions = list(base.get("questions", []))
            for field in sorted(set(conflicts)):
                label = conflict_labels.get(field, field.replace("_", " "))
                questions.append(
                    f"{label}-ஐ உறுதிப்படுத்துங்கள்."
                    if language == "ta"
                    else f"Please confirm the {label}."
                )
            base.update({
                "status": "clarification_required",
                "method": "deterministic_input_conflict_check",
                "message": (
                    "நீங்கள் தேர்ந்தெடுத்த விவரங்களும் விளக்கமும் முரண்படுகின்றன. பயிர்களை வரிசைப்படுத்தும் முன் அவற்றை உறுதிப்படுத்துங்கள்."
                    if language == "ta"
                    else "Your selected values and description conflict. Confirm the highlighted farm conditions before ranking crops."
                ),
                "conflicts": sorted(set(conflicts)),
                "questions": questions,
            })
            return base

        if season_month_conflict:
            base["conflicts"] = ["season_month"]
            base["questions"].append(
                "நீங்கள் தேர்ந்தெடுத்த விதைப்பு மாதமும் பருவமும் பொருந்துகிறதா என்பதை உறுதிப்படுத்துங்கள். இது உள்ளூர் விதைப்பு காலண்டர் அல்ல."
                if language == "ta"
                else "Your selected sowing month and season do not match this broad consistency check. Please confirm one; this is not a local sowing calendar."
            )
            base["limitations"].append("season_month_consistency_not_local_calendar")
            base["assumptions"].append(
                "பருவம் மற்றும் மாத ஒப்பீடு பொதுவான உள்ளீட்டு சரிபார்ப்பு மட்டுமே; பயிர் பொருத்த ஆதாரம் அல்ல."
                if language == "ta"
                else "Season/month consistency is a broad input check only, not crop-suitability evidence."
            )

        if parsed["intent"] == "unsupported":
            base.update({
                "status": "unsupported_request",
                "method": "deterministic_scope_check",
                "message": (
                    "இந்த கருவி விவசாயப் பயிர் தேர்வுக்கானது; இந்தக் கேள்வி அதன் வரம்பிற்கு வெளியே உள்ளது."
                    if language == "ta"
                    else "This tool handles farming and crop-selection questions; this request is outside its scope."
                ),
                "questions": [],
            })
            return base

        if parsed["intent"] == "meaningless":
            has_supported_structured_factor = (
                merged["irrigation"] in {"rainfed", "limited", "reliable"}
                or resolved_goal in {"low_water", "short_duration"}
                or resolved_issue == "low_rainfall"
            )
            if has_supported_structured_factor:
                base["limitations"].append("free_text_not_understood_structured_inputs_used")
                base["assumptions"].append(
                    "விளக்க உரை புரியவில்லை; தேர்ந்தெடுத்த ஆதரிக்கப்பட்ட படிவ மதிப்புகள் மட்டும் பயன்படுத்தப்பட்டன."
                    if language == "ta"
                    else "The description was not understood; supported structured selections alone were used."
                )
            else:
                base.update({
                    "status": "clarification_required",
                    "method": "insufficient_meaningful_farm_description",
                    "message": (
                        "பண்ணை விவரத்தைப் புரிந்துகொள்ள முடியவில்லை. மண், நீர், மழை, பருவம் அல்லது உங்கள் பயிர் முன்னுரிமையை தெளிவாக எழுதுங்கள்."
                        if language == "ta"
                        else "The farm description could not be understood. Please describe the soil, water, rainfall, season, or crop priority."
                    ),
                    "questions": [
                        "மண் வகை, நீர் கிடைப்பு, மழை நிலை அல்லது பயிர் கால இலக்கைச் சொல்ல முடியுமா?"
                        if language == "ta"
                        else "Can you provide the soil type, water availability, rainfall, or crop-duration priority?"
                    ],
                    "limitations": base["limitations"] + ["meaningful_farm_description_required"],
                })
                return base

        if parsed["intent"] in {"pest_disease", "pest_diagnosis"} and (
            not merged["affected_crop"]
            or not any(
                term in (merged["issue_description"] or "").casefold()
                for term in PEST_SYMPTOM_TERMS
            )
        ):
            questions = []
            if not merged["affected_crop"]:
                questions.append("எந்தப் பயிர் பாதிக்கப்பட்டுள்ளது?" if language == "ta" else "Which crop is affected?")
            if not any(
                term in (merged["issue_description"] or "").casefold()
                for term in PEST_SYMPTOM_TERMS
            ):
                questions.append(
                    "என்ன அறிகுறிகள் தெரிகின்றன? அவை எப்போது தொடங்கின?"
                    if language == "ta"
                    else "What visible symptoms do you observe, and when did they begin?"
                )
            base.update({
                "status": "clarification_required",
                "method": "pest_disease_triage_not_diagnosis",
                "message": (
                    "இந்தக் கருவி பூச்சி அல்லது நோயைக் கண்டறியாது. பயிர் தேர்விலிருந்து பிரச்சினையை வேறுபடுத்த கூடுதல் விவரங்கள் தேவை."
                    if language == "ta"
                    else "Pest and disease diagnosis is not supported. More details are needed to distinguish the issue from crop selection."
                ),
                "questions": questions,
                "conflicts": base.get("conflicts", []),
                "limitations": base["limitations"] + [
                    "consult_agricultural_officer_for_pest_or_disease",
                    *(["heavy_rainfall_not_assessed", "no_crop_ranking_for_unassessed_flood_risk"] if parsed["rainfall"] == "excess" or parsed.get("waterlogging") else []),
                ],
            })
            return base

        if parsed["intent"] == "pest_diagnosis":
            base.update({
                "status": "unsupported_request",
                "method": "pest_diagnosis_out_of_scope",
                "message": (
                    "இந்த கருவி பூச்சி அல்லது நோயைக் கண்டறியாது. அறிகுறிகளுக்காக உள்ளூர் வேளாண்மை விரிவாக்க அலுவலரை அணுகுங்கள்."
                    if language == "ta"
                    else "This tool does not diagnose pests or diseases. Consult a local agricultural extension officer about the symptoms."
                ),
                "limitations": base["limitations"] + ["consult_agricultural_officer_for_pest_or_disease"],
            })
            return base

        if parsed["rainfall"] == "excess" or parsed.get("waterlogging"):
            base.update({
                "status": "clarification_required" if season_month_conflict else "insufficient_data",
                "method": "ranking_withheld_for_unassessed_flood_risk",
                "message": (
                    "நிறுவப்பட்ட ஆதாரத்தில் நீர்தேக்கம் அல்லது வெள்ளத்தைத் தாங்கும் பயிர்கள் பற்றிய தகவல் இல்லை; எனவே பயிர் வரிசை வழங்கப்படவில்லை."
                    if language == "ta"
                    else "Crop ranking is withheld because the installed source does not establish waterlogging or flood tolerance."
                ),
                "questions": base.get("questions", []),
                "conflicts": base.get("conflicts", []),
                "limitations": base["limitations"] + ["heavy_rainfall_not_assessed", "no_crop_ranking_for_unassessed_flood_risk"],
            })
            return base

        if merged["issue"] == "heavy_rainfall":
            base.update({
                "status": "clarification_required" if season_month_conflict else "insufficient_data",
                "method": "ranking_withheld_for_unassessed_flood_risk",
                "message": (
                    "நிறுவப்பட்ட ஆதாரத்தில் நீர்தேக்கம் அல்லது வெள்ளத்தைத் தாங்கும் பயிர்கள் பற்றிய தகவல் இல்லை; எனவே பயிர் வரிசை வழங்கப்படவில்லை."
                    if language == "ta"
                    else "Crop ranking is withheld because the installed source does not establish waterlogging or flood tolerance."
                ),
                "questions": base.get("questions", []),
                "conflicts": base.get("conflicts", []),
                "limitations": base["limitations"] + ["heavy_rainfall_not_assessed", "no_crop_ranking_for_unassessed_flood_risk"],
            })
            return base

        unsupported_goal = resolved_goal is not None and resolved_goal not in {
            "low_water",
            "short_duration",
        }
        has_verified_sowing_window = self._has_verified_sowing_window(
            district=merged["district"],
            irrigation=merged["irrigation"],
            sowing_month=merged["sowing_month"],
        )
        independent_supported_evidence = (
            merged["irrigation"] in {"rainfed", "limited"}
            or parsed.get("rainfall") == "low"
            or resolved_issue == "low_rainfall"
            or has_verified_sowing_window
        )
        if unsupported_goal and not independent_supported_evidence:
            base.update({
                "status": "clarification_required",
                "method": "ranking_withheld_for_unsupported_goal",
                "message": (
                    "நிறுவப்பட்ட பயிர் அட்டவணை மண் வளம், மகசூல், லாபம் அல்லது முதலீட்டு இலக்குகளை மதிப்பிடாது. குறைந்த நீர் அல்லது குறுகிய கால இலக்கைத் தேர்வு செய்யுங்கள்; இல்லையெனில் உள்ளூர் வேளாண்மை ஆலோசனையைப் பெறுங்கள்."
                    if language == "ta"
                    else "The installed crop table cannot assess soil-fertility, yield, profit, or investment goals. Choose a less-water or short-duration goal, or consult a local agricultural adviser."
                ),
                "questions": [
                    "நீர் தேவையா அல்லது குறுகிய பயிர் காலமா உங்கள் முன்னுரிமை?"
                    if language == "ta"
                    else "Is lower water use or shorter crop duration your priority?"
                ],
                "limitations": base["limitations"] + [
                    "goal_not_supported_by_available_crop_data",
                    "no_crop_ranking_for_unassessed_goal",
                ],
            })
            return base
        if unsupported_goal:
            base["limitations"].append("goal_not_supported_by_available_crop_data")
            if resolved_goal == "improve_soil_fertility":
                base["limitations"].append("soil_test_needed_for_fertility_goal")
                base["questions"].append(
                    "மண் பரிசோதனை அறிக்கையில் pH, மின் கடத்துத்திறன் (EC), கரிமக் கார்பன், கிடைக்கும் N-P-K மதிப்புகள் உள்ளனவா? அவை மண் வள ஆலோசனையை மேம்படுத்தும்; இப்போது பயிர் வரிசையில் மண் வள இலக்கு மதிப்பிடப்படவில்லை."
                    if language == "ta"
                    else "Do you have soil-test values for pH, electrical conductivity (EC), organic carbon, and available N-P-K? They would help soil-fertility advice; the crop ranking cannot assess the fertility goal yet."
                )
            else:
                base["questions"].append(
                    "குறைந்த நீர் பயன்பாடா அல்லது குறுகிய காலப் பயிரா உங்கள் முன்னுரிமை?"
                    if language == "ta"
                    else "Is lower water use or shorter crop duration your priority? The selected economic goal is not assessed by the available source."
                )

        if (
            merged["irrigation"] is None
            and resolved_goal not in {"low_water", "short_duration"}
            and resolved_issue != "low_rainfall"
            and not has_verified_sowing_window
        ):
            base.update({
                "status": "clarification_required",
                "method": "essential_input_missing",
                "message": (
                    "கிடைக்கும் ஆதாரம் ஒப்பீட்டு நீர் தேவை அல்லது பயிர் காலத்தை வைத்து மட்டுமே ஒப்பிட உதவுகிறது."
                    if language == "ta"
                    else "The available source only supports comparisons by relative water requirement or crop duration."
                ),
                "questions": [
                    "நீர் குறைவாக உள்ளதா அல்லது மழையை மட்டுமே நம்புகிறீர்களா? குறுகிய காலப் பயிரா உங்கள் முன்னுரிமை?"
                    if language == "ta"
                    else "Is water limited or rain-fed, or is a short-duration crop your priority?"
                ],
            })
            return base

        result = self.recommend_for_simple_inputs(
            district=merged["district"],
            issue=resolved_issue,
            goal=resolved_goal or "not_provided",
            irrigation=merged["irrigation"],
            irrigation_method=merged["irrigation_method"],
            season=merged["season"],
            sowing_month=merged["sowing_month"],
            soil_type=merged["soil_type"],
            issue_description=merged["issue_description"],
            affected_crop=merged["affected_crop"],
            rainfall=parsed.get("rainfall"),
        )
        ranked_factors = set(result["analysis"].get("ranked_factors", []))
        usage_factors = {
            "district": (
                ["verified_sowing_window_match"]
                if result["analysis"].get("district_used_for_ranking")
                else []
            ),
            "soil_type": [],
            "rainfall": (
                ["water_availability"]
                if result["analysis"].get("water_preference_basis")
                == "reported_low_rainfall"
                else []
            ),
            "irrigation": (
                ["water_availability"]
                if "water_availability" in ranked_factors
                and result["analysis"].get("water_preference_basis") == "irrigation"
                else []
            ),
            "irrigation_method": [],
            "season": [],
            "sowing_month": (
                ["verified_sowing_window_match"]
                if "verified_sowing_window_match" in ranked_factors
                else []
            ),
            "issue": (
                ["water_availability"]
                if result["analysis"].get("water_preference_basis")
                == "reported_low_rainfall"
                else []
            ),
            "goal": ["farmer_goal"] if "farmer_goal" in ranked_factors else [],
        }
        for field, factors in usage_factors.items():
            if field in input_usage:
                input_usage[field] = {
                    "status": "scored" if factors else input_usage[field]["status"],
                    "scoring_factors": factors,
                }
        for field, usage in input_usage.items():
            if field in measurement_usage_fields:
                usage["status"] = (
                    "recorded_but_unscored"
                    if usage["status"] != "missing_or_unknown"
                    else usage["status"]
                )
        result["analysis"]["input_usage"] = input_usage
        recommendations = []
        prior_limitations = list(base["limitations"])
        prior_assumptions = list(base["assumptions"])
        for recommendation in result["recommendations"]:
            crop = recommendation["crop"]
            recommendations.append({
                **recommendation,
                "name_en": crop.replace("_", " ").title(),
                "name_ta": CROP_NAMES_TA.get(crop, crop),
                "reason_text": [
                    (
                        (
                            "ஒப்பீட்டளவில் குறைந்த நீர் தேவை"
                            if reason == "water_availability"
                            else "தேர்ந்தெடுத்த நீர் அல்லது கால இலக்குடன் பொருந்துகிறது"
                            if reason == "farmer_goal"
                            else "தேர்ந்த மாவட்டம் மற்றும் மாதத்திற்கான TNAU விதைப்பு கால ஆதாரம் பொருந்துகிறது."
                        )
                        if language == "ta"
                        else (
                            "Lower relative water requirement"
                            if reason == "water_availability"
                            else "Matches the selected water or duration goal"
                            if reason == "farmer_goal"
                            else "TNAU sowing-window evidence matches the selected district and month."
                        )
                    )
                    for reason in recommendation["reasons"]
                ],
                "seasonal_suitability": "not_assessed",
                "risks": [
                    "நிறுவப்பட்ட ஆதாரம் உள்ளூர் மண் மற்றும் பருவ பொருத்தத்தை மதிப்பிடவில்லை."
                    if language == "ta"
                    else "Local soil and seasonal suitability are not assessed by the installed source."
                ],
                "source": self.rules["source"],
            })
        base.update(result)
        if model_measurements:
            base["selected_context"]["model_measurements"] = model_measurements
            base["analysis"]["measurement_values_recorded"] = True
            base["analysis"]["measurement_values_used_for_ranking"] = False
        base["limitations"] = list(dict.fromkeys(
            [*base["limitations"], *prior_limitations]
        ))
        base["assumptions"] = list(dict.fromkeys(
            [*base.get("assumptions", []), *prior_assumptions]
        ))
        base["selected_context"]["free_text"] = free_text
        if season_month_conflict and "season_month_consistency_not_local_calendar" not in base["limitations"]:
            base["limitations"].append("season_month_consistency_not_local_calendar")
        base.update({
            "method": "deterministic_tnau_relative_water_duration_rules",
            "confidence": "low",
            "parsed_conditions": parsed_conditions,
            "recommendations": recommendations,
            "questions": base.get("questions", []),
            "conflicts": base.get("conflicts", []),
            "assumptions": [
                (
                    "பயிர் வரிசை என்பது வெளியிடப்பட்ட நீர் தேவை மற்றும் கால அட்டவணையின் ஒப்பீடு மட்டுமே; வெற்றி நிகழ்தகவு அல்ல."
                    if language == "ta"
                    else "Crop order is a relative comparison from the published water-requirement and duration table, not a probability of success."
                ),
                *([
                    "பருவம் மற்றும் மாத ஒப்பீடு பொதுவான உள்ளீட்டு சரிபார்ப்பு மட்டுமே; பயிர் பொருத்த ஆதாரம் அல்ல."
                    if language == "ta"
                    else "Season/month consistency is a broad input check only, not crop-suitability evidence."
                ] if season_month_conflict else []),
            ],
            "farming_guide": [
                "விதைப்பதற்கு முன் உள்ளூர் வேளாண்மை விரிவாக்க அலுவலரிடம் மண் மற்றும் பருவ பொருத்தத்தை உறுதிப்படுத்துங்கள்."
                if language == "ta"
                else "Confirm soil and seasonal suitability with the local agricultural extension office before sowing.",
                "வயல் முடிவுகளுக்கு உள்ளூர் மண் பரிசோதனையையும் அளவிடப்பட்ட நீர் கிடைப்பையும் பயன்படுத்துங்கள்."
                if language == "ta"
                else "Use a local soil test and measured water availability for field decisions.",
            ],
            "message": (
                "பயிர் வரிசை மேற்கோள் காட்டப்பட்ட நீர்/காலத் தரவையும், ஆதாரம் உள்ள பயிர்களுக்கு மட்டும் மாவட்டம்-மாத விதைப்பு காலத்தையும் அடிப்படையாகக் கொண்டது."
                if language == "ta"
                else "Relative crop options use cited water/duration data and district/month sowing windows only where crop-specific evidence exists."
            ),
        })
        if merged["issue"] == "pest_disease":
            base["limitations"].append("This crop comparison does not diagnose the reported pest or disease; seek local agricultural advice.")
        return base

    def _has_verified_sowing_window(
        self,
        *,
        district: str,
        irrigation: str | None,
        sowing_month: int | None,
    ) -> bool:
        if sowing_month is None:
            return False
        crop_evidence = self.rules.get("additional_evidence", {}).get(
            "crop_records", {}
        )
        for profile in crop_evidence.values():
            district_evidence = profile.get("districts", {})
            if district in district_evidence.get("excluded", []):
                continue
            matching_windows = [
                window for window in profile.get("sowing_windows", [])
                if sowing_month in window.get("months", [])
            ]
            regime = (
                "rainfed" if irrigation == "rainfed"
                else "irrigated" if irrigation == "reliable"
                else None
            )
            regime_windows = [
                window for window in matching_windows
                if "water_regime" in window
            ]
            if regime and regime_windows and not any(
                window["water_regime"] == regime
                for window in regime_windows
            ):
                continue
            district_windows = [
                window for window in matching_windows
                if window.get("districts")
            ]
            if (
                district != "not_provided"
                and district_windows
                and not any(
                    district in window["districts"]
                    for window in district_windows
                )
                and not any(
                    window.get("district_coverage")
                    for window in matching_windows
                )
            ):
                continue
            if district != "not_provided" and district_windows:
                matching_windows = [
                    window for window in matching_windows
                    if (
                        not window.get("districts")
                        or district in window["districts"]
                    )
                ]
            if matching_windows:
                return True
        return False

    @staticmethod
    def _parse_farm_text(text: str) -> dict[str, Any]:
        normalized = text.casefold()
        parsed: dict[str, Any] = {
            "intent": "crop_recommendation" if text.strip() else "structured",
            "conflicts": [],
            "rainfall": "not_provided",
        }
        found_districts = set()
        for name, code in TAMIL_DISTRICTS.items():
            if name in text:
                found_districts.add(code)
        for district in sorted(DISTRICTS, key=len, reverse=True):
            if re.search(rf"(?<![a-z]){re.escape(district)}(?![a-z])", normalized):
                found_districts.add(district)
        if len(found_districts) == 1:
            parsed["district"] = found_districts.pop()
        elif len(found_districts) > 1:
            parsed["conflicts"].append("district")

        soil_terms = {
            "red_loam": (
                "red soil", "red loam", "red-soil", "செம்மண்", "சிவப்பு மண்",
            ),
            "black": ("black soil", "கரிசல் மண்", "கருப்பு மண்", "கருமண்"),
            "clay": ("clay soil", "clayey", "clay", "களிமண்"),
            "sandy": (
                "sandy soil", "sandy", "sand soil", "மணல் மண்", "மணற்பாங்கான",
            ),
        }
        soils = [key for key, terms in soil_terms.items() if any(term in normalized for term in terms)]
        if len(soils) == 1:
            parsed["soil_type"] = soils[0]
        elif len(soils) > 1:
            parsed["conflicts"].append("soil_type")

        low_rain_terms = (
            "low rainfall", "less rain", "drought", "water scarcity",
            "மழை குறைவு", "மழை குறைவாக", "குறைந்த மழை", "வறட்சி",
        )
        high_rain_terms = ("heavy rainfall", "excess rainfall", "excess rain", "waterlogging", "flood", "அதிக மழை", "வெள்ளம்", "நீர்தேக்கம்")
        low_rain = any(term in normalized for term in low_rain_terms)
        high_rain = any(term in normalized for term in high_rain_terms)
        if low_rain and high_rain:
            parsed["conflicts"].append("rainfall")
        elif high_rain:
            parsed["rainfall"] = "excess"
            parsed["waterlogging"] = any(term in normalized for term in ("waterlogging", "நீர்தேக்கம்"))
            parsed["issue"] = "heavy_rainfall"
        elif low_rain:
            parsed["rainfall"] = "low"

        issue_phrases = {
            "low_fertility": (
                "low soil fertility", "soil fertility is low", "low fertility",
                "poor soil fertility", "nutrient-poor soil",
                "மண் வளம் குறைவு", "மண் வளம் குறைவாக",
            ),
            "ph_issue": (
                "soil ph", "soil pH", "acidic soil", "alkaline soil",
                "மண் அமிலத்தன்மை", "மண் காரத்தன்மை", "மண்ணின் ph",
            ),
            "market_profit": (
                "market price", "selling price", "low price", "market problem",
                "சந்தை விலை", "விற்பனை விலை", "விலை பிரச்சினை",
            ),
        }
        for issue_name, phrases in issue_phrases.items():
            if any(phrase.casefold() in normalized for phrase in phrases):
                parsed.setdefault("issue", issue_name)

        irrigation_values = []
        if any(term in normalized for term in (
            "rain-fed", "rainfed", "rain fed", "rainfall only",
            "மழையை மட்டும்", "மானாவாரி",
        )):
            irrigation_values.append("rainfed")
        if any(term in normalized for term in (
            "limited water", "water is limited", "water availability is limited",
            "limited availability of water", "little water", "very little water",
            "water scarce", "limited irrigation", "borewell water is limited",
            "குறைந்த தண்ணீர்",
            "குறைந்த தண்ணீரில்", "மிகக் குறைந்த தண்ணீர்", "தண்ணீர் பற்றாக்குறை",
            "குறைந்த நீர் கிடைப்பு", "பாசனம் குறைவு", "குறைந்த பாசனம்",
        )):
            irrigation_values.append("limited")
        if any(term in normalized for term in (
            "reliable irrigation", "ample water", "sufficient water",
            "adequate irrigation", "good irrigation", "நிறைய தண்ணீர்",
            "போதிய பாசனம்", "போதுமான நீர்",
        )):
            irrigation_values.append("reliable")
        if len(set(irrigation_values)) == 1:
            parsed["irrigation"] = irrigation_values[0]
        elif len(set(irrigation_values)) > 1:
            parsed["conflicts"].append("irrigation")

        irrigation_method_terms = {
            "drip": ("drip irrigation", "drip", "சொட்டு பாசனம்", "சொட்டு நீர்"),
            "sprinkler": ("sprinkler irrigation", "sprinkler", "தெளிப்பு பாசனம்"),
            "surface": ("surface irrigation", "surface method", "மேற்பரப்பு பாசனம்"),
            "furrow": ("furrow irrigation", "furrow method", "பாத்தி பாசனம்"),
        }
        irrigation_methods = [
            method
            for method, terms in irrigation_method_terms.items()
            if any(term in normalized for term in terms)
        ]
        if len(irrigation_methods) == 1:
            parsed["irrigation_method"] = irrigation_methods[0]
        elif len(irrigation_methods) > 1:
            parsed["conflicts"].append("irrigation_method")

        month_matches = {
            month
            for name, month in MONTHS.items()
            if (
                bool(re.search(rf"(?<![a-z]){re.escape(name)}(?![a-z])", normalized))
                if name.isascii()
                else name in normalized
            )
        }
        if len(month_matches) == 1:
            parsed["sowing_month"] = month_matches.pop()
        elif len(month_matches) > 1:
            parsed["conflicts"].append("sowing_month")

        season_terms = {
            "kharif": ("kharif", "காரிப்", "காரீப்"),
            "rabi": ("rabi", "ரபி"),
            "summer": ("summer", "கோடை"),
            "year_round": ("year-round", "year round", "ஆண்டு முழுவதும்"),
        }
        seasons = [
            season
            for season, terms in season_terms.items()
            if any(
                bool(re.search(rf"(?<![a-z]){re.escape(term)}(?![a-z])", normalized))
                if term.isascii()
                else term in normalized
                for term in terms
            )
        ]
        if len(seasons) == 1:
            parsed["season"] = seasons[0]
        elif len(seasons) > 1:
            parsed["conflicts"].append("season")

        if any(term in normalized for term in ("pest", "disease", "insect", "பூச்சி", "நோய்", "பாதிப்பு")):
            parsed["issue"] = "pest_disease"
            crop_match = re.search(r"\b(rice|sugarcane|groundnut|sorghum|maize|ragi|cotton|blackgram|soybean|sesame|sunflower)\b", normalized)
            if crop_match:
                parsed["affected_crop"] = crop_match.group(1)
            if text.strip():
                parsed["issue_description"] = text.strip()[:240]

        goal_phrases = {
            "higher_profit": ("high profit", "higher profit", "good profit", "earn well", "profit potential", "லாபம்", "அதிக வருமானம்"),
            "lower_investment": ("low investment", "lower investment", "குறைந்த முதலீடு"),
            "higher_yield": ("high yield", "higher yield", "அதிக மகசூல்"),
            "short_duration": (
                "short duration", "short-duration", "quick harvest",
                "குறுகிய காலம்", "குறுகிய காலப் பயிர்", "விரைவில் அறுவடை",
            ),
            "improve_soil_fertility": (
                "improve soil fertility", "improve soil health",
                "soil health", "மண் வளத்தை மேம்படுத்த", "மண் வளம் மேம்பட",
                "மண் ஆரோக்கியம்",
            ),
            "low_water": ("low water", "less water", "குறைந்த தண்ணீரில்", "குறைந்த நீரில்"),
        }
        detected_goals = [
            goal
            for goal, phrases in goal_phrases.items()
            if any(phrase in normalized for phrase in phrases)
        ]
        non_water_goals = [goal for goal in detected_goals if goal != "low_water"]
        if len(non_water_goals) == 1:
            parsed["goal"] = non_water_goals[0]
        elif len(non_water_goals) > 1:
            parsed["conflicts"].append("goal")
        elif "low_water" in detected_goals:
            parsed["goal"] = "low_water"

        if text.strip() and not any(term in normalized for term in (
            "farm", "field", "crop", "soil", "water", "rain", "drip",
            "sprinkler", "surface irrigation", "furrow", "prefer", "grow",
            "மண்", "தண்ணீர்", "மழை", "பயிர்", "விவசாய", "பாசனம்",
            "பூச்சி", "நோய்", "விரும்புகிறேன்", "விருப்பம்",
        )):
            words = re.findall(r"[a-z]{2,}|[\u0B80-\u0BFF]+", normalized)
            parsed["intent"] = (
                "unsupported" if len(words) >= 3 else "meaningless"
            )
        if any(term in normalized for term in ("pest", "disease", "insect", "பூச்சி", "நோய்")):
            crop_request_terms = (
                "which crop", "what crop", "suggest crop", "suggest crops",
                "recommend crop", "recommend crops", "crop should i grow",
                "பயிர் பரிந்துரை", "எந்த பயிர்", "பயிர் வேண்டும்",
            )
            parsed["intent"] = (
                "pest_disease"
                if any(term in normalized for term in crop_request_terms)
                else "pest_diagnosis"
            )
        return parsed

    def recommend_for_simple_inputs(
        self,
        *,
        district: str,
        issue: str,
        goal: str,
        irrigation: str | None,
        season: str | None,
        sowing_month: int | None,
        soil_type: str | None,
        issue_description: str | None,
        affected_crop: str | None = None,
        irrigation_method: str | None = None,
        rainfall: str | None = None,
    ) -> dict[str, Any]:
        water_choice = {
            "rainfed": "rainfed",
            "limited": "low",
        }.get(irrigation)
        water_preference_basis = "irrigation" if water_choice is not None else None
        if (issue == "low_rainfall" or rainfall == "low") and irrigation is None:
            water_choice = "low"
            water_preference_basis = "reported_low_rainfall"
        high_rainfall_blocks_ranking = issue == "heavy_rainfall"

        crops = self.rules["crops"]
        water_values = [
            float(crop["water_requirement_mm"])
            for crop in crops
            if crop.get("water_requirement_mm") is not None
        ]
        duration_values = [
            float(crop["duration_days"])
            for crop in crops
            if crop.get("duration_days") is not None
        ]
        water_range = (min(water_values), max(water_values))
        duration_range = (min(duration_values), max(duration_values))
        crop_evidence = self.rules.get("additional_evidence", {}).get(
            "crop_records", {}
        )
        evidence_sources = self.rules.get("evidence_sources", {})
        ranked = []
        excluded_crops = []
        calendar_options_not_ranked = []
        district_constraint_applied = False

        for crop in crops:
            if high_rainfall_blocks_ranking:
                continue
            crop_name = crop["crop"]
            profile = crop_evidence.get(crop_name, {})
            district_evidence = profile.get("districts", {})
            if (
                district_evidence
                and district in district_evidence.get("excluded", [])
            ):
                district_constraint_applied = True
                excluded_crops.append({
                    "crop": crop_name,
                    "reason": "district_excluded_by_source",
                    "source_id": district_evidence["source_id"],
                    "source": evidence_sources[district_evidence["source_id"]],
                })
                continue
            sowing_windows = profile.get("sowing_windows", [])
            matching_windows = []
            if sowing_month is not None and sowing_windows:
                month_windows = [
                    window for window in sowing_windows
                    if sowing_month in window["months"]
                ]
                matching_windows = list(month_windows)
                regime = (
                    "rainfed" if irrigation == "rainfed"
                    else "irrigated" if irrigation == "reliable"
                    else None
                )
                regime_windows = [
                    window for window in matching_windows
                    if "water_regime" in window
                ]
                if regime and regime_windows:
                    regime_matches = [
                        window for window in regime_windows
                        if window["water_regime"] == regime
                    ]
                    matching_windows = [
                        window for window in matching_windows
                        if "water_regime" not in window
                        or window["water_regime"] == regime
                    ]
                else:
                    regime_matches = regime_windows
                if regime and regime_windows and not regime_matches:
                    matching_windows = [
                        window for window in matching_windows
                        if "water_regime" not in window
                    ]
                if district != "not_provided" and month_windows:
                    district_windows = [
                        window for window in month_windows
                        if window.get("districts") or window.get("excluded_districts")
                    ]
                    district_constraint_applied |= bool(district_windows)
                    explicitly_excluded = [
                        window for window in district_windows
                        if district in window.get("excluded_districts", [])
                    ]
                    district_matches = [
                        window for window in matching_windows
                        if (
                            not window.get("districts")
                            or district in window["districts"]
                        )
                        and district not in window.get("excluded_districts", [])
                    ]
                    if district_windows and not district_matches and all(
                        window in explicitly_excluded
                        for window in district_windows
                    ) and len(explicitly_excluded) == len(district_windows):
                        excluded_crops.append({
                            "crop": crop_name,
                            "reason": "district_excluded_by_source",
                            "source_id": profile["source_id"],
                            "source": evidence_sources[profile["source_id"]],
                        })
                        continue
                    matching_windows = district_matches
            water_requirement = (
                float(crop["water_requirement_mm"])
                if crop.get("water_requirement_mm") is not None
                else None
            )
            duration = (
                float(crop["duration_days"])
                if crop.get("duration_days") is not None
                else None
            )
            water_score = None
            if water_requirement is None:
                water_score = None
            elif water_choice in {"low", "rainfed"}:
                water_score = 1 - self._scale(water_requirement, water_range)

            goal_score = self._supported_goal_score(
                crop, water_range, duration_range, goal
            )
            if (
                goal == "short_duration"
                and (
                    profile.get("variety_durations_days")
                    or profile.get("duration_note")
                )
            ):
                goal_score = None
            sowing_window_score = (
                1.0 if sowing_month is not None and matching_windows else None
            )
            primary_factor = None
            primary_score = None
            secondary_factor = None
            secondary_score = None
            if goal == "short_duration" and goal_score is not None:
                primary_factor = "farmer_goal"
                primary_score = goal_score
                if water_score is not None:
                    secondary_factor = "water_availability"
                    secondary_score = water_score
            elif water_score is not None:
                primary_factor = "water_availability"
                primary_score = water_score
            elif goal_score is not None:
                primary_factor = "farmer_goal"
                primary_score = goal_score
            elif sowing_window_score is not None:
                primary_factor = "verified_sowing_window_match"
                primary_score = sowing_window_score
            if primary_score is None:
                continue
            if (
                water_requirement is None
                and duration is None
                and any(
                    factor in {"water_availability", "farmer_goal"}
                    for factor in (
                        ["water_availability"] if water_choice is not None else []
                    ) + (
                        ["farmer_goal"]
                        if goal in {"low_water", "short_duration"}
                        else []
                    )
                )
            ):
                calendar_options_not_ranked.append({
                    "crop": crop_name,
                    "sowing_window_evidence": matching_windows,
                    "crop_sources": [
                        evidence_sources[source_id]
                        for source_id in {
                            profile.get("source_id"),
                            district_evidence.get("source_id"),
                        }
                        if source_id in evidence_sources
                    ],
                    "reason": "water_requirement_and_duration_not_in_comparison_table",
                })
                continue
            reasons = [primary_factor]
            score_breakdown = [{
                "factor": primary_factor,
                "score": round(primary_score, 4),
                "role": "primary",
            }]
            if secondary_factor is not None and secondary_score is not None:
                reasons.append(secondary_factor)
                score_breakdown.append({
                    "factor": secondary_factor,
                    "score": round(secondary_score, 4),
                    "role": "secondary",
                })
            if (
                sowing_window_score is not None
                and primary_factor != "verified_sowing_window_match"
            ):
                reasons.append("verified_sowing_window_match")
                score_breakdown.append({
                    "factor": "verified_sowing_window_match",
                    "score": round(sowing_window_score, 4),
                    "role": "tie_breaker",
                })
            ranked.append({
                "crop": crop_name,
                "relative_match_score": round(primary_score * 100, 1),
                "water_requirement_mm": water_requirement,
                "duration_days": duration,
                "water_requirement_class": self._water_class(
                    water_requirement, water_values
                ) if water_requirement is not None else "not_assessed",
                "reasons": reasons,
                "score_breakdown": score_breakdown,
                "primary_factor": primary_factor,
                "secondary_score": secondary_score,
                "calendar_match": sowing_window_score is not None,
                "classification": "conditionally_suitable",
                "evidence_notes": [
                    *(
                        [profile["water_management_note_id"]]
                        if profile.get("water_management_note_id")
                        else []
                    ),
                    *(
                        [profile["duration_note_id"]]
                        if profile.get("duration_note_id")
                        else []
                    ),
                    *(
                        [profile["sowing_window_note_id"]]
                        if matching_windows and profile.get("sowing_window_note_id")
                        else []
                    ),
                ],
                "crop_sources": [
                    evidence_sources[source_id]
                    for source_id in {
                        profile.get("source_id"),
                        district_evidence.get("source_id"),
                        profile.get("water_management_source_id"),
                    }
                    if source_id in evidence_sources
                ],
                "sowing_window_evidence": matching_windows,
            })

        ranked.sort(
            key=lambda crop: (
                -crop["relative_match_score"],
                -(
                    crop["secondary_score"]
                    if crop["secondary_score"] is not None
                    else -1
                ),
                -(1 if crop["calendar_match"] else 0),
                crop["crop"],
            )
        )
        sowing_window_factor_applied = any(
            "verified_sowing_window_match" in crop["reasons"]
            for crop in ranked
        )
        ranked_candidate_count = len(ranked)
        selected_crops = ranked[:3]
        recommendations = [
            {
                "rank": rank,
                **crop,
            }
            for rank, crop in enumerate(selected_crops, start=1)
        ]
        limitations = [
            "crop_specific_district_data_partial",
            "crop_specific_season_data_partial",
            "soil_compatibility_not_assessed",
            "cost_and_market_data_unavailable",
            "crop_specific_farming_guide_unavailable",
            "rainfall_not_measured",
            "water_supply_volume_not_provided",
        ]
        if soil_type not in {None, "unknown"}:
            limitations.append("selected_soil_type_not_scored")
        if irrigation_method is not None:
            limitations.append("irrigation_method_not_scored")
        if goal in {"higher_profit", "lower_investment"}:
            limitations.append("economic_goal_not_scored")
        if season is not None:
            limitations.append("selected_season_not_scored")
        if sowing_month is not None:
            limitations.append(
                "selected_sowing_month_partially_scored"
                if any(profile.get("sowing_windows") for profile in crop_evidence.values())
                else "selected_sowing_month_not_scored"
            )
        if calendar_options_not_ranked:
            limitations.append(
                "calendar_matched_crops_not_ranked_water_and_duration_unknown"
            )
        if issue == "heavy_rainfall":
            limitations.extend([
                "heavy_rainfall_not_assessed",
                "no_crop_ranking_for_unassessed_flood_risk",
            ])
        elif issue == "low_rainfall" or rainfall == "low":
            limitations.append("low_rainfall_is_qualitative_only")
        elif issue == "not_provided":
            limitations.append("farming_challenge_not_provided")
        else:
            limitations.append("reported_problem_not_assessed")
        if irrigation == "reliable":
            limitations.append("reliable_irrigation_not_quantified")
        if issue == "pest_disease":
            limitations.append("consult_agricultural_officer_for_pest_or_disease")
        if issue_description:
            limitations.append("issue_description_is_context_only_not_diagnosed")
        if not recommendations:
            limitations.append("no_supported_ranking_factor_selected")

        if high_rainfall_blocks_ranking:
            ranking_strategy = "withheld_heavy_rainfall"
        elif not recommendations:
            ranking_strategy = "not_available"
        elif (
            "farmer_goal" in {factor for crop in ranked for factor in crop["reasons"]}
            and water_choice is not None
        ):
            ranking_strategy = "short_duration_then_water"
        elif "water_availability" in {
            factor for crop in ranked for factor in crop["reasons"]
        }:
            ranking_strategy = "water_availability_primary"
        elif "farmer_goal" in {
            factor for crop in ranked for factor in crop["reasons"]
        }:
            ranking_strategy = "farmer_goal_primary"
        else:
            ranking_strategy = "verified_sowing_window_only"
        used_factors = list(dict.fromkeys(
            factor
            for crop in ranked
            for factor in crop["reasons"]
        ))
        return {
            "status": "relative_advisory" if recommendations else "insufficient_data",
            "method": (
                "tnau_relative_water_duration_rule_ranking"
                if recommendations
                else "no_crop_ranking_without_supported_answers"
            ),
            "district": district,
            "issue": issue,
            "goal": goal,
            "selected_context": {
                "irrigation": irrigation,
                "irrigation_method": irrigation_method,
                "season": season,
                "sowing_month": sowing_month,
                "soil_type": soil_type,
                "rainfall": rainfall,
                "issue_description": issue_description,
                **({"affected_crop": affected_crop} if affected_crop else {}),
            },
            "recommendations": recommendations,
            "source": self.rules["source"],
            "analysis": {
                "selected_context_recorded": True,
                "district_used_for_ranking": district_constraint_applied,
                "soil_used_for_ranking": False,
                "season_used_for_ranking": False,
                "sowing_month_used_for_constraints": (
                    sowing_month is not None
                    and any(
                        profile.get("sowing_windows")
                        for profile in crop_evidence.values()
                    )
                ),
                "weather_measurement_used": False,
                "water_preference_basis": water_preference_basis,
                "crop_suitability_assessed": False,
                "score_is_probability": False,
                "rainfall_measured": False,
                "crop_guide_available": False,
                "district_and_sowing_constraints_applied_to": [
                    crop for crop in crop_evidence
                    if crop_evidence[crop].get("districts")
                    or crop_evidence[crop].get("sowing_windows")
                ],
                "calendar_options_not_ranked": calendar_options_not_ranked,
                "irrigation_method_used_for_ranking": False,
                "excluded_crops": excluded_crops,
                "unknown_crop_factors_not_scored": self.rules.get(
                    "additional_evidence", {}
                ).get("unknown_for_crops_without_specific_records", []),
                "ranking_strategy": ranking_strategy,
                "score_method": "lexicographic_primary_factor_with_evidence_tiebreakers",
                "ranked_factors": [] if high_rainfall_blocks_ranking else used_factors,
                "ranked_candidate_count": ranked_candidate_count,
                "recommendation_limit": 3,
            },
            "limitations": limitations,
            "advisory_only": True,
        }

    @staticmethod
    def _crop_name_tamil(crop: str) -> str:
        names = {
            "rice": "நெல்",
            "sugarcane": "கரும்பு",
            "groundnut": "நிலக்கடலை",
            "sorghum": "சோளம்",
            "maize": "மக்காச்சோளம்",
            "ragi": "கேழ்வரகு",
            "cotton": "பருத்தி",
            "blackgram": "உளுந்து",
            "soybean": "சோயாபீன்",
            "sesame": "எள்",
            "sunflower": "சூரியகாந்தி",
        }
        return names[crop]

    @staticmethod
    def _simple_reasons(
        goal: str, availability: str
    ) -> list[str]:
        reasons = []
        if availability == "medium":
            reasons.append("middle_relative_water_need")
        else:
            reasons.append("relative_water_need_matches_selected_availability")
        if goal == "low_water":
            reasons.append("lower_water_use_supports_goal")
        elif goal == "short_duration":
            reasons.append("shorter_duration_supports_goal")
        return reasons

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
    ) -> float | None:
        relative_need = self._scale(requirement, value_range)
        if availability in {"low", "rainfed"}:
            return 1 - relative_need
        return None

    def _supported_goal_score(
        self,
        crop: dict[str, Any],
        water_range: tuple[float, float],
        duration_range: tuple[float, float],
        goal: str,
    ) -> float | None:
        if goal == "low_water":
            if crop.get("water_requirement_mm") is None:
                return None
            return 1 - self._scale(
                float(crop["water_requirement_mm"]), water_range
            )
        if goal == "short_duration":
            if crop.get("duration_days") is None:
                return None
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
