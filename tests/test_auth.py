import asyncio
import json
import os
import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

from backend import auth
from backend.api import farmer_guide, geospatial, history, model, prediction
from backend.services import location_estimate


class _AuthResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def read(self):
        return json.dumps({"id": "verified-user"}).encode()


class AuthenticationTests(unittest.TestCase):
    def test_missing_bearer_token_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(auth.require_authenticated_user(None))
        self.assertEqual(raised.exception.status_code, 401)

    def test_missing_supabase_configuration_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(
                    auth.require_authenticated_user(
                        HTTPAuthorizationCredentials(
                            scheme="Bearer", credentials="example-token"
                        )
                    )
                )
        self.assertEqual(raised.exception.status_code, 503)

    def test_supabase_validates_bearer_token_and_supplies_user_identity(self):
        def fake_urlopen(request, timeout):
            self.assertTrue(request.get_header("Authorization").startswith("Bearer "))
            self.assertEqual(
                request.full_url,
                "https://project.example/auth/v1/user",
            )
            self.assertEqual(timeout, 10)
            return _AuthResponse()

        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://project.example/",
                "SUPABASE_PUBLISHABLE_KEY": "example-publishable",
            },
        ):
            with patch.object(auth, "urlopen", fake_urlopen):
                user_id = asyncio.run(
                    auth.require_authenticated_user(
                        HTTPAuthorizationCredentials(
                            scheme="Bearer", credentials="example-token"
                        )
                    )
                )
        self.assertEqual(user_id, "verified-user")

    def test_supabase_rejection_maps_to_unauthorized(self):
        def reject_token(request, timeout):
            error = HTTPError(
                request.full_url, 401, "Unauthorized", None, BytesIO()
            )
            error.close()
            raise error

        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://project.example",
                "SUPABASE_PUBLISHABLE_KEY": "example-publishable",
            },
        ):
            with patch.object(auth, "urlopen", reject_token):
                with self.assertRaises(HTTPException) as raised:
                    asyncio.run(
                        auth.require_authenticated_user(
                            HTTPAuthorizationCredentials(
                                scheme="Bearer", credentials="invalid-token"
                            )
                        )
                    )
        self.assertEqual(raised.exception.status_code, 401)

    def test_data_and_model_routes_require_authenticated_user_dependency(self):
        protected_paths = {
            "/predict",
            "/predict/preview",
            "/farmer-guide/predict",
            "/farmer-guide/crop-recommendations",
            "/farmer-guide/location-estimate",
            "/geospatial/soil-lookup",
            "/geospatial/climate-lookup",
            "/geospatial/local-lookup",
            "/location-data",
            "/history",
            "/model/metrics",
            "/model/features",
            "/model/importance",
            "/model/crop-calendar",
            "/crops",
        }
        routers = (
            prediction.router,
            farmer_guide.router,
            geospatial.router,
            geospatial.location_data_router,
            history.router,
            model.router,
            model.crops_router,
        )
        found_paths = set()
        for router in routers:
            for route in router.routes:
                if not isinstance(route, APIRoute) or route.path not in protected_paths:
                    continue
                found_paths.add(route.path)
                dependencies = {
                    dependency.call for dependency in route.dependant.dependencies
                }
                self.assertIn(auth.require_authenticated_user, dependencies)
        self.assertEqual(found_paths, protected_paths)

    def test_prediction_preview_returns_model_result_without_history_dependency(self):
        class PredictorStub:
            def predict(self, values):
                self.values = values
                return {"best_crop": "rice", "recommendations": []}

        predictor = PredictorStub()
        request = prediction.PredictionInput(
            N=90,
            P=42,
            K=43,
            temperature=20.8,
            humidity=82,
            ph=6.5,
            rainfall=202,
        )
        with patch.object(prediction, "get_predictor", return_value=predictor):
            result = prediction.preview_prediction(request, "verified-user")

        self.assertTrue(result["success"])
        self.assertEqual(result["best_crop"], "rice")
        self.assertEqual(predictor.values["N"], 90)

    def test_crop_calendar_uses_existing_sourced_duration_rules(self):
        result = model.crop_calendar()

        self.assertTrue(result["source"]["url"].startswith("https://"))
        self.assertTrue(
            any(
                crop["crop"] == "rice" and crop["duration_days"] > 0
                for crop in result["crops"]
            )
        )

    def test_farmer_guide_accepts_optional_coordinate_pair_as_context(self):
        request = farmer_guide.FarmerGuideInput.model_validate(
            {
                "language": "en",
                "district": "salem",
                "latitude": 11.6643,
                "longitude": 78.146,
                "soil_choice": "black",
                "water_choice": "low",
                "weather_problem": "normal",
                "farmer_goal": "safe",
            }
        )

        self.assertEqual(request.latitude, 11.6643)
        self.assertEqual(request.longitude, 78.146)

    def test_farmer_guide_rejects_partial_coordinate_pair(self):
        with self.assertRaises(ValidationError):
            farmer_guide.FarmerGuideInput.model_validate(
                {
                    "language": "en",
                    "district": "salem",
                    "latitude": 11.6643,
                    "soil_choice": "black",
                    "water_choice": "low",
                    "weather_problem": "normal",
                    "farmer_goal": "safe",
                }
            )

    def test_farmer_guide_saves_selected_field_location_as_context(self):
        request = farmer_guide.FarmerGuideInput.model_validate(
            {
                "language": "en",
                "district": "salem",
                "latitude": 11.6643,
                "longitude": 78.146,
                "soil_choice": "black",
                "water_choice": "low",
                "weather_problem": "normal",
                "farmer_goal": "safe",
            }
        )

        class DatabaseStub:
            def save_farmer_session(self, selections, result, user_id):
                self.selections = selections
                self.result = result
                self.user_id = user_id
                return 1

        database = DatabaseStub()
        response = farmer_guide.farmer_predict(
            request, "verified-user", database
        )

        self.assertEqual(
            response["risk_context"]["field_location"],
            {"latitude": 11.6643, "longitude": 78.146},
        )
        self.assertEqual(
            database.result["risk_context"]["field_location"],
            {"latitude": 11.6643, "longitude": 78.146},
        )
        self.assertEqual(database.user_id, "verified-user")

    def test_farmer_guide_location_estimate_uses_only_local_soil_properties(self):
        local_result = {
            "inputs": {"N": 90.0, "ph": 6.5},
            "properties": {"N": {"units": "kg/ha"}},
            "unavailable_properties": ["P", "K", "temperature", "humidity", "rainfall"],
            "dataset_status": "partial",
            "provenance": {"dataset_name": "Local test data"},
            "warnings": ["Temperature unavailable."],
        }
        with patch.object(location_estimate, "lookup_local_soil", return_value=local_result):
            result = location_estimate.get_location_estimate(11.66, 78.14)

        self.assertEqual(result["estimated_inputs"], {"N": 90.0, "ph": 6.5})
        self.assertIsNone(result["annual_rainfall_mm"])
        self.assertEqual(result["sources"]["soil"], "Local test data")
        self.assertIn("local climate dataset", result["sources"]["climate"])

    def test_clients_cannot_supply_a_user_id_in_protected_request_models(self):
        with self.assertRaises(ValidationError):
            prediction.PredictionRequest.model_validate(
                {
                    "N": 1,
                    "P": 1,
                    "K": 1,
                    "temperature": 20,
                    "humidity": 50,
                    "ph": 6,
                    "rainfall": 100,
                    "user_id": "another-user",
                }
            )
        with self.assertRaises(ValidationError):
            farmer_guide.FarmerGuideInput.model_validate(
                {
                    "language": "en",
                    "district": "salem",
                    "soil_choice": "black",
                    "water_choice": "low",
                    "weather_problem": "normal",
                    "farmer_goal": "safe",
                    "user_id": "another-user",
                }
            )

    def test_prediction_accepts_geospatial_provenance_in_advisory_context(self):
        request = prediction.PredictionRequest.model_validate(
            {
                "N": 50,
                "P": 40,
                "K": 40,
                "temperature": 25,
                "humidity": 70,
                "ph": 6.5,
                "rainfall": 100,
                "advisory_context": {
                    "geospatial_estimate": {
                        "source": "Local soil dataset",
                        "properties": {"N": {"units": "kg/ha"}},
                        "unavailable_properties": ["temperature", "humidity", "rainfall"],
                        "user_reviewed": True,
                    }
                },
            }
        )

        self.assertTrue(
            request.advisory_context.model_dump()["geospatial_estimate"]["user_reviewed"]
        )


if __name__ == "__main__":
    unittest.main()
