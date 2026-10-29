import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.api.farmer_guide import (
    SimpleFarmerRecommendationInput,
    require_authenticated_user,
)
from backend.database import DatabaseError, get_database
from backend.main import app
from backend.schema import FEATURES
from backend.services.farmer_crop_recommender import FarmerCropRecommender


class SimpleFarmerRecommendationTests(unittest.TestCase):
    def setUp(self):
        self.recommender = FarmerCropRecommender()

    def request(self, **overrides):
        values = {
            "district": "salem",
            "issue": "low_rainfall",
            "goal": "low_water",
            "irrigation": "limited",
        }
        values.update(overrides)
        return SimpleFarmerRecommendationInput.model_validate(values)

    def test_simple_flow_returns_source_backed_relative_water_crop_options(self):
        result = self.recommender.recommend_for_simple_inputs(
            district="salem",
            issue="low_rainfall",
            goal="low_water",
            irrigation="limited",
            season="kharif",
            sowing_month=7,
            soil_type="black",
            issue_description=None,
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(
            result["method"], "tnau_relative_water_duration_rule_ranking"
        )
        self.assertEqual(
            [crop["crop"] for crop in result["recommendations"][:3]],
            ["sesame", "blackgram", "ragi"],
        )
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertEqual(
            [crop["rank"] for crop in result["recommendations"]],
            list(range(1, 4)),
        )
        self.assertEqual(result["analysis"]["ranked_candidate_count"], 11)
        self.assertEqual(result["analysis"]["recommendation_limit"], 3)
        self.assertGreaterEqual(
            result["recommendations"][0]["relative_match_score"], 0
        )
        self.assertGreater(
            result["recommendations"][0]["relative_match_score"],
            result["recommendations"][1]["relative_match_score"],
        )
        self.assertEqual(
            result["analysis"]["ranked_factors"],
            ["water_availability", "verified_sowing_window_match"],
        )
        self.assertNotIn("rule_match_score", result["recommendations"][0])
        self.assertTrue(result["analysis"]["district_used_for_ranking"])
        self.assertFalse(result["analysis"]["soil_used_for_ranking"])
        self.assertTrue(result["source"]["url"].startswith("https://"))
        self.assertIn("crop_specific_district_data_partial", result["limitations"])
        self.assertTrue(result["recommendations"][0]["score_breakdown"])
        self.assertEqual(
            result["recommendations"][0]["score_breakdown"][0]["role"],
            "primary",
        )
        self.assertNotIn("weight", result["recommendations"][0]["score_breakdown"][0])

    def test_legacy_recommender_surfaces_unsupported_water_and_goal_combinations(self):
        with self.assertRaisesRegex(ValueError, "does not support"):
            self.recommender.recommend(
                district="salem",
                soil_choice="unknown",
                water_choice="high",
                weather_problem="normal",
                farmer_goal="higher_yield",
                language="en",
            )

    def test_english_free_text_extracts_supported_conditions_and_ranks(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Coimbatore, red soil, low rainfall, limited water, September.",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(result["parsed_conditions"]["district"], "coimbatore")
        self.assertEqual(result["parsed_conditions"]["soil_type"], "red_loam")
        self.assertEqual(result["parsed_conditions"]["rainfall"], "low")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "limited")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 9)
        self.assertEqual(result["recommendations"][0]["crop"], "sesame")
        self.assertEqual(result["recommendations"][0]["name_ta"], "எள்")

    def test_irrigation_availability_does_not_infer_farmer_goal(self):
        parsed = self.recommender._parse_farm_text(
            "Low rainfall, poor soil fertility, limited water."
        )
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="thoothukudi",
            free_text="Low rainfall, poor soil fertility, limited water.",
            issue="low_fertility",
            goal="improve_soil_fertility",
            irrigation="limited",
            sowing_month=11,
            soil_type="sandy",
        )

        self.assertEqual(parsed["irrigation"], "limited")
        self.assertNotIn("goal", parsed)
        self.assertEqual(result.get("conflicts", []), [])
        self.assertEqual(result["parsed_conditions"]["rainfall"], "low")
        self.assertEqual(result["status"], "relative_advisory")
        self.assertTrue(result["recommendations"])
        self.assertEqual(result["goal"], "improve_soil_fertility")
        self.assertIn("goal_not_supported_by_available_crop_data", result["limitations"])
        self.assertIn("soil_test_needed_for_fertility_goal", result["limitations"])
        self.assertEqual(len(result["questions"]), 1)
        self.assertIn("soil-test", result["questions"][0])

    def test_description_only_fertility_challenge_is_retained_and_water_rank_is_conditional(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="thoothukudi",
            free_text="Low soil fertility, low rainfall, limited water in November.",
        )

        self.assertEqual(result["issue"], "low_fertility")
        self.assertEqual(result["parsed_conditions"]["rainfall"], "low")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "limited")
        self.assertEqual(result["status"], "relative_advisory")
        self.assertTrue(result["recommendations"])
        self.assertIn("water_availability", result["analysis"]["ranked_factors"])

    def test_tamil_free_text_extracts_soil_rainfall_and_water_goal(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="எனக்கு சிவப்பு மண் உள்ளது. மழை குறைவாக உள்ளது. குறைந்த தண்ணீரில் வளரக்கூடிய பயிர் வேண்டும். ஆகஸ்ட் மாதத்தில் காரிப் பருவத்தில் விதைக்கிறேன்.",
            language="ta",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(result["parsed_conditions"]["soil_type"], "red_loam")
        self.assertEqual(result["parsed_conditions"]["rainfall"], "low")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "limited")
        self.assertEqual(result["parsed_conditions"]["goal"], "low_water")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 8)
        self.assertEqual(result["parsed_conditions"]["season"], "kharif")
        self.assertEqual(
            result["parsed_conditions"]["season_month_consistency"],
            "consistent",
        )

    def test_tamil_month_case_suffix_is_extracted(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="சிவப்பு மண், குறைந்த தண்ணீர், செப்டம்பரில் விதைக்கிறேன்.",
            language="ta",
        )

        self.assertEqual(result["parsed_conditions"]["soil_type"], "red_loam")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "limited")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 9)

    def test_irrigation_method_is_parsed_and_reported_but_not_scored(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Coimbatore, red soil, drip irrigation, limited water.",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(result["parsed_conditions"]["irrigation_method"], "drip")
        self.assertFalse(result["analysis"]["irrigation_method_used_for_ranking"])
        self.assertIn("irrigation_method_not_scored", result["limitations"])

    def test_sowing_calendar_can_support_provisional_ranking_for_unscored_goal(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="thanjavur",
            goal="higher_yield",
            irrigation="reliable",
            season="kharif",
            sowing_month=8,
            soil_type="clay",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertIn(
            "rice",
            [crop["crop"] for crop in result["recommendations"]],
        )
        self.assertEqual(
            result["analysis"]["ranked_factors"],
            ["verified_sowing_window_match"],
        )
        self.assertIn("goal_not_supported_by_available_crop_data", result["limitations"])

    def test_model_measurements_are_recorded_but_not_used_in_crop_ranking(self):
        measurements = {
            "N": 35,
            "P": 22.5,
            "ph": 6.7,
            "rainfall": 410,
            "electrical_conductivity_ds_m": 0.8,
            "organic_carbon_pct": 0.45,
        }
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="coimbatore",
            goal="low_water",
            irrigation="limited",
            soil_type="red_loam",
            model_measurements=measurements,
        )

        self.assertEqual(result["selected_context"]["model_measurements"], measurements)
        self.assertTrue(result["analysis"]["measurement_values_recorded"])
        self.assertFalse(result["analysis"]["measurement_values_used_for_ranking"])
        self.assertIn("model_measurements_not_scored", result["limitations"])
        self.assertEqual(
            result["analysis"]["ranked_factors"],
            ["water_availability"],
        )
        self.assertEqual(
            result["analysis"]["input_usage"]["goal"]["status"],
            "recorded_but_unscored",
        )

    def test_crop_names_in_description_do_not_select_or_force_a_crop(self):
        baseline = self.recommender.analyze_farm_and_recommend_crops(
            district="thanjavur",
            irrigation="limited",
            goal="low_water",
        )
        with_crop_name = self.recommender.analyze_farm_and_recommend_crops(
            district="thanjavur",
            irrigation="limited",
            goal="low_water",
            free_text="I prefer paddy.",
        )

        self.assertEqual(baseline["status"], "relative_advisory")
        self.assertEqual(with_crop_name["status"], "relative_advisory")
        self.assertEqual(
            [item["crop"] for item in with_crop_name["recommendations"]],
            [item["crop"] for item in baseline["recommendations"]],
        )
        self.assertNotIn("preferred_crop", with_crop_name["selected_context"])

    def test_meaningless_text_does_not_override_supported_structured_inputs(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="jk;",
            irrigation="limited",
            goal="low_water",
            district="namakkal",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertTrue(result["recommendations"])
        self.assertIn(
            "free_text_not_understood_structured_inputs_used",
            result["limitations"],
        )

    def test_meaningless_text_without_supported_inputs_asks_for_farm_details(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="jk;",
        )

        self.assertEqual(result["status"], "clarification_required")
        self.assertEqual(result["recommendations"], [])
        self.assertIn("meaningful_farm_description_required", result["limitations"])

    def test_unselected_issue_and_goal_are_not_replaced_with_defaults(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="thanjavur",
            irrigation="reliable",
            season="kharif",
            sowing_month=8,
            soil_type="clay",
        )

        self.assertEqual(result["issue"], "not_provided")
        self.assertEqual(result["goal"], "not_provided")
        self.assertEqual(result["parsed_conditions"]["issue"], "not_provided")
        self.assertEqual(result["parsed_conditions"]["goal"], "not_provided")
        self.assertIn(
            "rice",
            [crop["crop"] for crop in result["recommendations"]],
        )
        self.assertTrue(result["analysis"]["district_used_for_ranking"])

    def test_district_ranking_flag_only_reports_an_applied_district_constraint(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="salem",
            issue="low_rainfall",
            goal="low_water",
            irrigation="limited",
        )

        self.assertTrue(result["recommendations"])
        self.assertFalse(result["analysis"]["district_used_for_ranking"])

    def test_verified_ragi_district_exclusion_is_applied_and_traceable(self):
        result = self.recommender.recommend_for_simple_inputs(
            district="kanyakumari",
            issue="no_problem",
            goal="low_water",
            irrigation="limited",
            season=None,
            sowing_month=9,
            soil_type="red_loam",
            issue_description=None,
        )

        self.assertNotIn(
            "ragi",
            [recommendation["crop"] for recommendation in result["recommendations"]],
        )
        excluded = next(
            item for item in result["analysis"]["excluded_crops"]
            if item["crop"] == "ragi"
        )
        self.assertEqual(excluded["reason"], "district_excluded_by_source")
        self.assertEqual(excluded["source_id"], "ragi_seasons_varieties")
        self.assertTrue(excluded["source"]["url"].startswith("https://"))

    def test_verified_ragi_month_window_is_applied_by_irrigation_regime(self):
        rainfed = self.recommender.recommend_for_simple_inputs(
            district="namakkal",
            issue="no_problem",
            goal="low_water",
            irrigation="rainfed",
            season=None,
            sowing_month=9,
            soil_type="red_loam",
            issue_description=None,
        )
        reliable = self.recommender.recommend_for_simple_inputs(
            district="namakkal",
            issue="no_problem",
            goal="low_water",
            irrigation="reliable",
            season=None,
            sowing_month=9,
            soil_type="red_loam",
            issue_description=None,
        )

        self.assertNotIn(
            "ragi",
            [entry["crop"] for entry in rainfed["analysis"]["excluded_crops"]],
        )
        reliable_ragi = next(
            recommendation for recommendation in reliable["recommendations"]
            if recommendation["crop"] == "ragi"
        )
        self.assertNotIn("verified_sowing_window_match", reliable_ragi["reasons"])

    def test_verified_thanjavur_rice_window_ranks_automatically_without_crop_choice(self):
        thaj_august = self.recommender.recommend_for_simple_inputs(
            district="thanjavur",
            issue="no_problem",
            goal="higher_yield",
            irrigation="reliable",
            season="kharif",
            sowing_month=8,
            soil_type="clay",
            issue_description=None,
        )
        self.assertEqual(len(thaj_august["recommendations"]), 2)
        rice = next(
            crop for crop in thaj_august["recommendations"]
            if crop["crop"] == "rice"
        )
        cowpea = next(
            crop for crop in thaj_august["recommendations"]
            if crop["crop"] == "cowpea"
        )
        self.assertEqual(rice["relative_match_score"], 100)
        self.assertEqual(cowpea["relative_match_score"], 100)
        self.assertIn(
            "verified_sowing_window_match",
            rice["reasons"],
        )
        self.assertEqual(
            thaj_august["analysis"]["ranking_strategy"],
            "verified_sowing_window_only",
        )
        self.assertNotIn(
            "rice",
            [entry["crop"] for entry in thaj_august["analysis"]["excluded_crops"]],
        )

        salem_august = self.recommender.recommend_for_simple_inputs(
            district="salem",
            issue="no_problem",
            goal="higher_yield",
            irrigation="reliable",
            season="kharif",
            sowing_month=8,
            soil_type="clay",
            issue_description=None,
        )
        self.assertNotIn(
            "rice",
            [entry["crop"] for entry in salem_august["recommendations"]],
        )
        self.assertNotIn(
            "rice",
            [entry["crop"] for entry in salem_august["analysis"]["excluded_crops"]],
        )

    def test_calendar_candidates_without_comparison_values_are_disclosed_unranked(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="namakkal",
            issue="low_rainfall",
            goal="short_duration",
            irrigation="limited",
            sowing_month=9,
        )

        self.assertEqual(len(self.recommender.rules["crops"]), 13)
        calendar_options = result["analysis"]["calendar_options_not_ranked"]
        self.assertEqual(
            {option["crop"] for option in calendar_options},
            {"cowpea", "redgram"},
        )
        for option in calendar_options:
            self.assertEqual(
                option["reason"],
                "water_requirement_and_duration_not_in_comparison_table",
            )
            self.assertTrue(option["sowing_window_evidence"])
            self.assertTrue(
                all(
                    source["publisher"]
                    == "Tamil Nadu Agricultural University, Agritech Portal"
                    for source in option["crop_sources"]
                )
            )
        self.assertNotIn(
            "cowpea",
            [crop["crop"] for crop in result["recommendations"]],
        )
        self.assertIn(
            "calendar_matched_crops_not_ranked_water_and_duration_unknown",
            result["limitations"],
        )

    def test_district_and_calendar_evidence_change_eligible_crop_options(self):
        def recommend(district):
            return self.recommender.analyze_farm_and_recommend_crops(
                district=district,
                issue="not_provided",
                goal="higher_yield",
                irrigation="reliable",
                season="kharif",
                sowing_month=8,
            )

        thanjavur = recommend("thanjavur")
        salem = recommend("salem")

        thanjavur_crops = [item["crop"] for item in thanjavur["recommendations"]]
        salem_crops = [item["crop"] for item in salem["recommendations"]]
        self.assertIn("rice", thanjavur_crops)
        self.assertNotIn("rice", salem_crops)
        self.assertIn("cowpea", thanjavur_crops)
        self.assertIn("redgram", salem_crops)
        self.assertNotIn("rice", [
            item["crop"] for item in salem["analysis"]["excluded_crops"]
        ])

    def test_sorghum_calendar_match_adds_documented_factor_without_hard_exclusion(self):
        coimbatore = self.recommender.recommend_for_simple_inputs(
            district="coimbatore",
            issue="low_rainfall",
            goal="short_duration",
            irrigation="limited",
            season="kharif",
            sowing_month=7,
            soil_type=None,
            issue_description=None,
        )
        kanyakumari = self.recommender.recommend_for_simple_inputs(
            district="kanyakumari",
            issue="low_rainfall",
            goal="short_duration",
            irrigation="limited",
            season="kharif",
            sowing_month=7,
            soil_type=None,
            issue_description=None,
        )
        self.assertIn(
            "verified_sowing_window_match",
            coimbatore["analysis"]["ranked_factors"],
        )
        self.assertNotIn(
            "verified_sowing_window_match",
            kanyakumari["analysis"]["ranked_factors"],
        )
        self.assertNotIn(
            "sorghum",
            [item["crop"] for item in kanyakumari["analysis"]["excluded_crops"]],
        )

    def test_exact_kallakurichi_clay_limited_water_november_profit_scenario(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="kallakurichi",
            soil_type="clay",
            irrigation="limited",
            sowing_month=11,
            goal="higher_profit",
            issue="no_problem",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(result["parsed_conditions"]["district"], "kallakurichi")
        self.assertEqual(result["parsed_conditions"]["soil_type"], "clay")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 11)
        self.assertTrue(result["recommendations"])
        self.assertEqual(len(result["questions"]), 1)
        self.assertIn("goal_not_supported_by_available_crop_data", result["limitations"])
        self.assertNotIn("no_crop_ranking_for_unassessed_goal", result["limitations"])

    def test_exact_coimbatore_flood_risk_and_rabi_september_form_scenario(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="coimbatore",
            issue="heavy_rainfall",
            goal="lower_investment",
            irrigation="rainfed",
            season="rabi",
            sowing_month=9,
            soil_type="black",
        )

        self.assertEqual(result["status"], "clarification_required")
        self.assertEqual(result["parsed_conditions"]["district"], "coimbatore")
        self.assertEqual(result["parsed_conditions"]["soil_type"], "black")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "rainfed")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 9)
        self.assertEqual(result["parsed_conditions"]["season"], "rabi")
        self.assertEqual(result["parsed_conditions"]["goal"], "lower_investment")
        self.assertEqual(result["parsed_conditions"]["season_month_consistency"], "conflict")
        self.assertEqual(result["recommendations"], [])
        self.assertIn("season_month", result["conflicts"])
        self.assertTrue(result["questions"])
        self.assertIn("no_crop_ranking_for_unassessed_flood_risk", result["limitations"])

    def test_unquantified_reliable_irrigation_does_not_create_water_suitability(self):
        limited = self.recommender.analyze_farm_and_recommend_crops(
            district="coimbatore",
            issue="no_problem",
            goal=None,
            irrigation="limited",
        )
        reliable = self.recommender.analyze_farm_and_recommend_crops(
            district="coimbatore",
            issue="no_problem",
            goal=None,
            irrigation="reliable",
        )

        self.assertEqual(limited["status"], "relative_advisory")
        self.assertEqual(limited["analysis"]["ranked_factors"], ["water_availability"])
        self.assertEqual(reliable["status"], "insufficient_data")
        self.assertEqual(reliable["recommendations"], [])
        self.assertIsNone(reliable["analysis"]["water_preference_basis"])
        self.assertIn("reliable_irrigation_not_quantified", reliable["limitations"])

    def test_season_month_warning_does_not_block_preliminary_water_ranking(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            district="coimbatore",
            issue="no_problem",
            goal="low_water",
            irrigation="limited",
            season="rabi",
            sowing_month=9,
            soil_type="black",
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertTrue(result["recommendations"])
        self.assertIn("season_month", result["conflicts"])
        self.assertTrue(result["questions"])
        self.assertFalse(result["analysis"]["season_used_for_ranking"])
        self.assertTrue(result["analysis"]["sowing_month_used_for_constraints"])

    def test_free_text_kallakurichi_request_ranks_water_and_discloses_profit_goal_gap(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text=(
                "I have clay soil in Kallakurichi. Water availability is limited. "
                "I want to sow in November and earn a good profit. Suggest suitable "
                "crops that require less water."
            ),
        )

        self.assertEqual(result["status"], "relative_advisory")
        self.assertEqual(result["parsed_conditions"]["district"], "kallakurichi")
        self.assertEqual(result["parsed_conditions"]["soil_type"], "clay")
        self.assertEqual(result["parsed_conditions"]["irrigation"], "limited")
        self.assertEqual(result["parsed_conditions"]["sowing_month"], 11)
        self.assertEqual(result["parsed_conditions"]["goal"], "higher_profit")
        self.assertTrue(result["recommendations"])
        self.assertEqual(len(result["questions"]), 1)
        self.assertIn("goal_not_supported_by_available_crop_data", result["limitations"])

    def test_conflicting_selected_and_text_facts_request_clarification(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Coimbatore, red soil, low rainfall, limited water.",
            district="salem",
        )

        self.assertEqual(result["status"], "clarification_required")
        self.assertEqual(result["conflicts"], ["district"])
        self.assertEqual(result["recommendations"], [])
        self.assertTrue(result["questions"])

    def test_missing_ranking_signal_asks_only_essential_follow_up(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="I need a crop recommendation.",
        )

        self.assertEqual(result["status"], "clarification_required")
        self.assertEqual(len(result["questions"]), 1)

    def test_waterlogging_withholds_ranking_and_pest_case_requests_crop(self):
        flood = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Clay soil, excess rainfall, waterlogging. Suggest crops.",
        )
        pest = self.recommender.analyze_farm_and_recommend_crops(
            free_text="My field has possible pest damage.",
        )
        pest_and_flood = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Clay soil, excess rainfall, waterlogging, and possible pest damage.",
        )
        diagnosis_only = self.recommender.analyze_farm_and_recommend_crops(
            free_text="My rice leaves have yellow spots. What disease is this?",
        )

        self.assertEqual(flood["status"], "insufficient_data")
        self.assertEqual(flood["recommendations"], [])
        self.assertEqual(pest["status"], "clarification_required")
        self.assertTrue(any("Which crop" in question for question in pest["questions"]))
        self.assertEqual(pest_and_flood["status"], "clarification_required")
        self.assertEqual(pest_and_flood["recommendations"], [])
        self.assertIn("no_crop_ranking_for_unassessed_flood_risk", pest_and_flood["limitations"])
        self.assertEqual(diagnosis_only["status"], "unsupported_request")
        self.assertEqual(diagnosis_only["recommendations"], [])
        self.assertIn("consult_agricultural_officer_for_pest_or_disease", diagnosis_only["limitations"])

    def test_unrelated_question_is_not_treated_as_crop_request(self):
        result = self.recommender.analyze_farm_and_recommend_crops(
            free_text="How can I renew my driving license?",
        )

        self.assertEqual(result["status"], "unsupported_request")
        self.assertEqual(result["recommendations"], [])

    def test_text_issue_categories_are_recorded_without_becoming_crop_rules(self):
        fertility = self.recommender.analyze_farm_and_recommend_crops(
            free_text="My soil has low fertility and water is limited.",
        )
        acidity = self.recommender.analyze_farm_and_recommend_crops(
            free_text="மண்ணின் ph பிரச்சினை உள்ளது; குறைந்த தண்ணீர்.",
        )
        market = self.recommender.analyze_farm_and_recommend_crops(
            free_text="Market price is low, but water is limited.",
        )

        self.assertEqual(fertility["parsed_conditions"]["issue"], "low_fertility")
        self.assertEqual(acidity["parsed_conditions"]["issue"], "ph_issue")
        self.assertEqual(market["parsed_conditions"]["issue"], "market_profit")
        self.assertEqual(market["parsed_conditions"]["rainfall"], "not_provided")
        self.assertIn("reported_problem_not_assessed", market["limitations"])

    def test_simple_flow_does_not_claim_unsupported_soil_or_market_suitability(self):
        pest_result = self.recommender.recommend_for_simple_inputs(
            district="erode",
            issue="pest_disease",
            goal="higher_yield",
            irrigation=None,
            season=None,
            sowing_month=None,
            soil_type=None,
            issue_description="இலைகளில் புள்ளிகள்",
        )

        self.assertEqual(pest_result["status"], "insufficient_data")
        self.assertEqual(pest_result["recommendations"], [])
        self.assertIn(
            "consult_agricultural_officer_for_pest_or_disease",
            pest_result["limitations"],
        )
        self.assertIn(
            "no_supported_ranking_factor_selected",
            pest_result["limitations"],
        )
        self.assertIn(
            "issue_description_is_context_only_not_diagnosed",
            pest_result["limitations"],
        )

    def test_simple_answers_support_low_rainfall_and_short_duration_guidance(self):
        rainfall_result = self.recommender.recommend_for_simple_inputs(
            district="salem",
            issue="low_rainfall",
            goal="higher_yield",
            irrigation=None,
            season=None,
            sowing_month=None,
            soil_type=None,
            issue_description=None,
        )
        duration_result = self.recommender.recommend_for_simple_inputs(
            district="salem",
            issue="no_problem",
            goal="short_duration",
            irrigation=None,
            season=None,
            sowing_month=None,
            soil_type=None,
            issue_description=None,
        )

        self.assertEqual(rainfall_result["analysis"]["water_preference_basis"], "reported_low_rainfall")
        self.assertEqual(rainfall_result["recommendations"][0]["crop"], "sesame")
        self.assertIn("low_rainfall_is_qualitative_only", rainfall_result["limitations"])
        self.assertEqual(duration_result["analysis"]["ranked_factors"], ["farmer_goal"])
        self.assertEqual(duration_result["recommendations"][0]["crop"], "blackgram")

    def test_short_duration_goal_changes_the_ranking_when_water_is_limited(self):
        common = {
            "district": "salem",
            "issue": "no_problem",
            "irrigation": "limited",
            "season": None,
            "sowing_month": None,
            "soil_type": None,
            "issue_description": None,
        }
        low_water = self.recommender.recommend_for_simple_inputs(
            goal="low_water", **common
        )
        short_duration = self.recommender.recommend_for_simple_inputs(
            goal="short_duration", **common
        )

        self.assertEqual(
            [crop["crop"] for crop in low_water["recommendations"][:3]],
            ["sesame", "blackgram", "ragi"],
        )
        self.assertEqual(
            [crop["crop"] for crop in short_duration["recommendations"][:3]],
            ["blackgram", "sesame", "soybean"],
        )
        self.assertEqual(len(low_water["recommendations"]), 3)
        self.assertEqual(len(short_duration["recommendations"]), 3)
        self.assertNotEqual(
            low_water["recommendations"][0]["crop"],
            short_duration["recommendations"][0]["crop"],
        )
        self.assertEqual(
            short_duration["analysis"]["ranking_strategy"],
            "short_duration_then_water",
        )
        self.assertEqual(
            self.recommender.rules["scoring"].get("weights"),
            None,
        )
        blackgram = short_duration["recommendations"][0]
        self.assertEqual(
            [factor["role"] for factor in blackgram["score_breakdown"]],
            ["primary", "secondary"],
        )
        self.assertEqual(
            blackgram["score_breakdown"][0]["factor"],
            "farmer_goal",
        )
        self.assertEqual(
            blackgram["score_breakdown"][0]["score"] * 100,
            blackgram["relative_match_score"],
        )
        self.assertNotIn("weight", blackgram["score_breakdown"][0])
        self.assertNotIn(
            "ragi",
            [crop["crop"] for crop in short_duration["recommendations"]],
        )

    def test_namakkal_and_coimbatore_farm_profiles_use_water_and_duration_inputs(self):
        namakkal = self.recommender.recommend_for_simple_inputs(
            district="namakkal",
            issue="low_rainfall",
            goal="short_duration",
            irrigation="limited",
            season="kharif",
            sowing_month=9,
            soil_type="red_loam",
            issue_description=None,
        )
        coimbatore = self.recommender.recommend_for_simple_inputs(
            district="coimbatore",
            issue="low_rainfall",
            goal="low_water",
            irrigation="limited",
            irrigation_method="drip",
            season="kharif",
            sowing_month=9,
            soil_type="red_loam",
            issue_description=None,
        )

        self.assertEqual(namakkal["recommendations"][0]["crop"], "blackgram")
        self.assertTrue(namakkal["analysis"]["sowing_month_used_for_constraints"])
        self.assertEqual(coimbatore["recommendations"][0]["crop"], "sesame")
        self.assertNotEqual(
            namakkal["recommendations"][0]["crop"],
            coimbatore["recommendations"][0]["crop"],
        )
        self.assertEqual(coimbatore["selected_context"]["irrigation_method"], "drip")
        self.assertFalse(coimbatore["analysis"]["irrigation_method_used_for_ranking"])
        self.assertIn("irrigation_method_not_scored", coimbatore["limitations"])

    def test_soil_health_goal_without_supported_scoring_evidence_withholds_ranking(self):
        result = self.recommender.recommend_for_simple_inputs(
            district="salem",
            issue="low_fertility",
            goal="improve_soil_fertility",
            irrigation=None,
            season=None,
            sowing_month=None,
            soil_type="red_loam",
            issue_description="Poor soil fertility.",
        )

        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["recommendations"], [])
        self.assertIn("reported_problem_not_assessed", result["limitations"])
        self.assertIn("no_supported_ranking_factor_selected", result["limitations"])

    def test_requested_scenarios_use_only_supported_inputs_and_withhold_flood_ranking(self):
        def recommend(**overrides):
            values = {
                "district": "coimbatore",
                "issue": "low_rainfall",
                "goal": "low_water",
                "irrigation": "limited",
                "season": "kharif",
                "sowing_month": 7,
                "soil_type": "sandy",
                "issue_description": None,
            }
            values.update(overrides)
            return self.recommender.recommend_for_simple_inputs(**values)

        sandy_low_rain = recommend()
        clay_low_rain = recommend(soil_type="clay")
        adequate_irrigation = recommend(
            issue="low_rainfall",
            goal="low_water",
            irrigation="reliable",
            soil_type="red_loam",
            season="rabi",
            sowing_month=12,
        )
        different_month = recommend(sowing_month=3)
        excess_rain = recommend(
            issue="heavy_rainfall",
            irrigation="reliable",
            goal="higher_yield",
        )

        self.assertEqual(
            [crop["crop"] for crop in sandy_low_rain["recommendations"]],
            [crop["crop"] for crop in clay_low_rain["recommendations"]],
        )
        self.assertNotIn(
            "cowpea",
            [
                crop["crop"]
                for crop in different_month["analysis"]["calendar_options_not_ranked"]
            ],
        )
        self.assertIn(
            "cowpea",
            [
                crop["crop"]
                for crop in sandy_low_rain["analysis"]["calendar_options_not_ranked"]
            ],
        )
        self.assertEqual(
            sandy_low_rain["recommendations"][0]["crop"],
            "sesame",
        )
        self.assertEqual(
            adequate_irrigation["recommendations"][0]["crop"],
            "sesame",
        )
        self.assertEqual(
            sandy_low_rain["recommendations"][0]["water_requirement_class"],
            "low",
        )
        self.assertFalse(sandy_low_rain["analysis"]["soil_used_for_ranking"])
        self.assertFalse(sandy_low_rain["analysis"]["season_used_for_ranking"])
        self.assertTrue(sandy_low_rain["analysis"]["sowing_month_used_for_constraints"])
        self.assertIn("crop_specific_season_data_partial", sandy_low_rain["limitations"])
        self.assertIn("water_supply_volume_not_provided", sandy_low_rain["limitations"])
        self.assertEqual(excess_rain["recommendations"], [])
        self.assertIn("no_crop_ranking_for_unassessed_flood_risk", excess_rain["limitations"])

    def test_quick_flow_never_claims_to_rank_unsupported_issues_or_goals(self):
        issues = (
            "heavy_rainfall",
            "low_fertility",
            "ph_issue",
            "market_profit",
            "other",
        )
        goals = (
            "higher_yield",
            "lower_investment",
            "higher_profit",
            "improve_soil_fertility",
        )
        for issue in issues:
            for goal in goals:
                with self.subTest(issue=issue, goal=goal):
                    result = self.recommender.recommend_for_simple_inputs(
                        district="salem",
                        issue=issue,
                        goal=goal,
                        irrigation=None,
                        season=None,
                        sowing_month=None,
                        soil_type=None,
                        issue_description="சுருக்கமான விவரம்" if issue == "other" else None,
                    )
                    self.assertEqual(result["recommendations"], [])

    def test_district_does_not_change_relative_crop_ranking(self):
        common = {
            "issue": "no_problem",
            "goal": "higher_yield",
            "irrigation": "limited",
            "season": None,
            "sowing_month": None,
            "soil_type": None,
            "issue_description": None,
        }
        salem = self.recommender.recommend_for_simple_inputs(
            district="salem", **common
        )
        madurai = self.recommender.recommend_for_simple_inputs(
            district="madurai", **common
        )

        self.assertEqual(
            [crop["crop"] for crop in salem["recommendations"]],
            [crop["crop"] for crop in madurai["recommendations"]],
        )
        self.assertFalse(salem["analysis"]["district_used_for_ranking"])
        self.assertFalse(madurai["analysis"]["district_used_for_ranking"])

    def test_simple_request_requires_supported_district_issue_goal_and_other_description(self):
        base = {
            "district": "salem",
            "issue": "no_problem",
            "goal": "higher_yield",
        }
        request = SimpleFarmerRecommendationInput.model_validate(base)
        self.assertIsNone(request.irrigation)
        self.assertIsNone(request.season)
        self.assertIsNone(request.soil_type)

        for invalid in (
            {**base, "district": "unknown"},
            {**base, "issue": "flood"},
            {**base, "goal": "profit"},
            {**base, "issue": "other"},
            {**base, "issue": "other", "issue_description": "x" * 241},
            {**base, "issue": "pest_disease"},
            {**base, "sowing_month": 13},
            {**base, "preferred_crop": "rice"},
            {**base, "model_measurements": {"EC": 0.3}},
            {**base, "model_measurements": {"ph": 15}},
            {**base, "model_measurements": {"N": float("nan")}},
            {**base, "model_measurements": {"N": 10**1000}},
            {**base, "model_measurements": {"electrical_conductivity_ds_m": 1001}},
            {**base, "model_measurements": {"organic_carbon_pct": -1}},
        ):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValidationError):
                    SimpleFarmerRecommendationInput.model_validate(invalid)

    def test_api_endpoint_returns_validated_simple_recommendation_result(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            with patch(
                "backend.api.farmer_guide.get_predictor",
                side_effect=AssertionError("simple flow must not call the model"),
            ):
                response = TestClient(app).post(
                    "/farmer-guide/crop-recommendations",
                    json={
                        "district": "salem",
                        "issue": "low_rainfall",
                        "goal": "low_water",
                        "irrigation": "rainfed",
                        "irrigation_method": "drip",
                        "season": "rabi",
                        "sowing_month": 1,
                        "soil_type": "clay",
                    },
                )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "relative_advisory")
        self.assertTrue(data["recommendations"])
        self.assertGreaterEqual(
            data["recommendations"][0]["relative_match_score"], 0
        )
        self.assertLessEqual(
            data["recommendations"][0]["relative_match_score"], 100
        )
        self.assertTrue(data["analysis"]["district_used_for_ranking"])
        self.assertEqual(data["selected_context"]["irrigation"], "rainfed")
        self.assertEqual(data["selected_context"]["irrigation_method"], "drip")
        self.assertNotIn("preferred_crop", data["selected_context"])
        self.assertEqual(data["selected_context"]["season"], "rabi")
        self.assertEqual(data["selected_context"]["sowing_month"], 1)
        self.assertEqual(data["selected_context"]["soil_type"], "clay")

    def test_api_records_measurements_without_scoring_them(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        measurements = {
            "N": 32,
            "P": 18,
            "ph": 6.5,
            "electrical_conductivity_ds_m": 0.72,
            "organic_carbon_pct": 0.41,
        }
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "district": "coimbatore",
                    "goal": "low_water",
                    "irrigation": "limited",
                    "model_measurements": measurements,
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["selected_context"]["model_measurements"], measurements)
        self.assertTrue(data["analysis"]["measurement_values_recorded"])
        self.assertFalse(data["analysis"]["measurement_values_used_for_ranking"])
        self.assertIn("model_measurements_not_scored", data["limitations"])
        self.assertTrue(data["recommendations"])

    def test_api_does_not_invent_unselected_challenge_or_goal(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "district": "thanjavur",
                    "irrigation": "reliable",
                    "season": "kharif",
                    "sowing_month": 8,
                    "soil_type": "clay",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["issue"], "not_provided")
        self.assertEqual(data["goal"], "not_provided")
        self.assertIn(
            "rice",
            [crop["crop"] for crop in data["recommendations"]],
        )
        self.assertTrue(data["analysis"]["district_used_for_ranking"])

    def test_free_text_api_request_reaches_analyzer_and_returns_standard_response(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "language": "ta",
                    "free_text": "Coimbatore, red soil, low rainfall, limited water, September.",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "relative_advisory")
        self.assertEqual(data["parsed_conditions"]["district"], "coimbatore")
        self.assertEqual(data["recommendations"][0]["name_ta"], "எள்")

    def test_exact_coimbatore_form_request_api_withholds_ranking_and_returns_season_question(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "district": "coimbatore",
                    "issue": "heavy_rainfall",
                    "goal": "lower_investment",
                    "irrigation": "rainfed",
                    "season": "rabi",
                    "sowing_month": 9,
                    "soil_type": "black",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "clarification_required")
        self.assertEqual(data["parsed_conditions"]["goal"], "lower_investment")
        self.assertEqual(data["parsed_conditions"]["irrigation"], "rainfed")
        self.assertEqual(data["parsed_conditions"]["season_month_consistency"], "conflict")
        self.assertEqual(data["recommendations"], [])
        self.assertTrue(data["questions"])
        self.assertIn("no_crop_ranking_for_unassessed_flood_risk", data["limitations"])

    def test_exact_kallakurichi_request_ranks_supported_water_factor_with_profit_limitation(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "district": "kallakurichi",
                    "soil_type": "clay",
                    "irrigation": "limited",
                    "sowing_month": 11,
                    "goal": "higher_profit",
                    "issue": "no_problem",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "relative_advisory")
        self.assertEqual(data["parsed_conditions"]["district"], "kallakurichi")
        self.assertEqual(data["parsed_conditions"]["goal"], "higher_profit")
        self.assertTrue(data["recommendations"])
        self.assertTrue(data["questions"])
        self.assertIn("goal_not_supported_by_available_crop_data", data["limitations"])

    def test_namakkal_soil_fertility_goal_returns_conditional_water_ranking(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={
                    "language": "en",
                    "district": "namakkal",
                    "soil_type": "red_loam",
                    "issue": "low_rainfall",
                    "goal": "improve_soil_fertility",
                    "irrigation": "limited",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "relative_advisory")
        self.assertEqual(data["parsed_conditions"]["district"], "namakkal")
        self.assertEqual(data["parsed_conditions"]["soil_type"], "red_loam")
        self.assertEqual(data["parsed_conditions"]["goal"], "improve_soil_fertility")
        self.assertTrue(data["recommendations"])
        self.assertEqual(len(data["questions"]), 1)
        self.assertIn("goal_not_supported_by_available_crop_data", data["limitations"])
        self.assertIn("soil_test_needed_for_fertility_goal", data["limitations"])

    def test_service_failure_returns_actionable_api_error(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            with patch(
                "backend.api.farmer_guide.farmer_crop_recommender.analyze_farm_and_recommend_crops",
                side_effect=RuntimeError("test failure"),
            ):
                response = TestClient(app).post(
                    "/farmer-guide/crop-recommendations",
                    json={"free_text": "I need a crop recommendation."},
                )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["code"], "recommendation_failed")
        self.assertIn("could not be completed", response.json()["message"])

    def test_empty_recommendation_request_returns_standard_error_response(self):
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        try:
            response = TestClient(app).post(
                "/farmer-guide/crop-recommendations",
                json={},
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["code"], "invalid_request")
        self.assertTrue(response.json()["errors"])

    def test_authentication_failure_uses_standard_error_response(self):
        app.dependency_overrides.pop(require_authenticated_user, None)
        response = TestClient(app).post(
            "/farmer-guide/crop-recommendations",
            json={"free_text": "limited water and low rainfall"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["code"], "unauthorized")
        self.assertTrue(response.json()["message"])

    def test_farmer_guidance_is_returned_when_history_database_is_unavailable(self):
        class FailingHistoryDatabase:
            def save_farmer_session(self, selections, result, user_id):
                raise DatabaseError("test database failure")

        app.dependency_overrides[require_authenticated_user] = (
            lambda: "synthetic-farmer-user"
        )
        app.dependency_overrides[get_database] = lambda: FailingHistoryDatabase()
        try:
            response = TestClient(app).post(
                "/farmer-guide/predict",
                json={
                    "language": "en",
                    "district": "dharmapuri",
                    "soil_choice": "unknown",
                    "water_choice": "high",
                    "weather_problem": "normal",
                    "farmer_goal": "short_duration",
                },
            )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)
            app.dependency_overrides.pop(get_database, None)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result["success"])
        self.assertFalse(result["history_saved"])
        self.assertIsNone(result["session_id"])
        self.assertFalse(result["model_prediction_available"])
        self.assertTrue(result["warnings"])

    def test_existing_seven_feature_model_contract_is_unchanged(self):
        self.assertEqual(
            FEATURES,
            ("N", "P", "K", "temperature", "humidity", "ph", "rainfall"),
        )


if __name__ == "__main__":
    unittest.main()
