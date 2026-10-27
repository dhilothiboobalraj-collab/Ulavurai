import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.api.farmer_guide import (
    SimpleFarmerRecommendationInput,
    require_authenticated_user,
)
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

    def test_returns_three_source_backed_choices_and_does_not_claim_district_fit(self):
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

        self.assertEqual(len(result["recommendations"]), 3)
        self.assertEqual(result["status"], "provisional")
        self.assertEqual(result["district_data"]["status"], "unavailable")
        self.assertFalse(result["ranking_context"]["district_used"])
        self.assertFalse(result["ranking_context"]["season_used"])
        self.assertEqual(result["recommendations"][0]["crop"], "sesame")
        self.assertEqual(result["recommendations"][0]["crop_ta"], "எள்")
        self.assertEqual(result["recommendations"][0]["water_requirement_class"], "low")
        self.assertEqual(result["recommendations"][0]["season_guidance"], None)
        self.assertEqual(result["recommendations"][0]["input_cost_category"], None)
        self.assertEqual(result["recommendations"][0]["market_information"], None)
        self.assertIn("district_soil_climate_data_unavailable", result["limitations"])
        self.assertIsNone(result["source_last_updated"])

    def test_short_duration_goal_changes_ranking_and_explains_it(self):
        result = self.recommender.recommend_for_simple_inputs(
            district="madurai",
            issue="no_problem",
            goal="short_duration",
            irrigation="reliable",
            season=None,
            sowing_month=None,
            soil_type=None,
            issue_description=None,
        )

        self.assertEqual(result["recommendations"][0]["crop"], "blackgram")
        self.assertIn(
            "shorter_duration_supports_goal",
            result["recommendations"][0]["reasons"],
        )

    def test_low_rainfall_uses_a_relative_water_rule_but_pest_is_not_diagnosed(self):
        dry_result = self.recommender.recommend_for_simple_inputs(
            district="erode",
            issue="low_rainfall",
            goal="higher_yield",
            irrigation=None,
            season=None,
            sowing_month=None,
            soil_type=None,
            issue_description=None,
        )
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

        self.assertEqual(
            dry_result["ranking_context"]["water_availability_used"], "rainfed"
        )
        self.assertIn(
            "consult_agricultural_officer_for_pest_or_disease",
            pest_result["limitations"],
        )
        self.assertIn(
            "issue_description_is_context_only_not_diagnosed",
            pest_result["limitations"],
        )

    def test_unavailable_issues_and_goals_are_never_claimed_as_ranked_factors(self):
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
                    self.assertIn(
                        "goal_not_supported_by_available_crop_data",
                        result["limitations"],
                    )
                    self.assertIn(
                        "issue_not_supported_by_available_crop_data",
                        result["limitations"],
                    )
                    self.assertEqual(len(result["recommendations"]), 3)

    def test_district_does_not_change_ranking_without_district_specific_sources(self):
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
            {**base, "sowing_month": 13},
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
                        "issue": "no_problem",
                        "goal": "short_duration",
                    },
                )
        finally:
            app.dependency_overrides.pop(require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "provisional")
        self.assertEqual(len(data["recommendations"]), 3)
        self.assertEqual(data["recommendations"][0]["crop"], "blackgram")

    def test_existing_seven_feature_model_contract_is_unchanged(self):
        self.assertEqual(
            FEATURES,
            ("N", "P", "K", "temperature", "humidity", "ph", "rainfall"),
        )


if __name__ == "__main__":
    unittest.main()
