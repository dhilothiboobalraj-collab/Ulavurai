from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.api import prediction
from backend.auth import require_authenticated_user
from backend.database import DatabaseError, PredictionDatabase, get_database
from backend.main import app
from backend.services.predictor import get_predictor


FEATURES = ("N", "P", "K", "temperature", "humidity", "ph", "rainfall")


class FailingHistoryDatabase:
    def initialize(self) -> None:
        pass

    def save_prediction(self, *args: object, **kwargs: object) -> None:
        raise DatabaseError("test database failure")


class PredictionApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database = PredictionDatabase(
            Path(self.temporary_directory.name) / "predictions.db"
        )
        self.database.initialize()
        self.payload = {
            feature: float(get_predictor().dataset.iloc[0][feature])
            for feature in FEATURES
        }
        app.dependency_overrides[require_authenticated_user] = (
            lambda: "prediction-api-test-user"
        )
        app.dependency_overrides[get_database] = lambda: self.database

    def tearDown(self) -> None:
        app.dependency_overrides.pop(require_authenticated_user, None)
        app.dependency_overrides.pop(get_database, None)
        self.temporary_directory.cleanup()

    def test_saved_model_recommendation_is_returned_and_saved(self) -> None:
        with TestClient(app) as client:
            response = client.post("/predict", json=self.payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result["success"])
        self.assertTrue(result["history_saved"])
        self.assertTrue(result["best_crop"])
        self.assertEqual(result["recommendations"][0]["crop"], result["best_crop"])
        self.assertEqual(
            len(self.database.list_predictions("prediction-api-test-user")),
            1,
        )

    def test_invalid_model_input_returns_validation_error(self) -> None:
        payload = {**self.payload, "humidity": 101}

        with TestClient(app) as client:
            response = client.post("/predict", json=payload)

        self.assertEqual(response.status_code, 422)

    def test_history_failure_does_not_discard_model_recommendation(self) -> None:
        app.dependency_overrides[get_database] = FailingHistoryDatabase
        with TestClient(app) as client:
            response = client.post("/predict", json=self.payload)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result["success"])
        self.assertFalse(result["history_saved"])
        self.assertTrue(result["best_crop"])
        self.assertTrue(any("could not be saved" in warning for warning in result["warnings"]))

    def test_farmer_guide_context_is_validated_and_saved_with_prediction(self) -> None:
        guide_context = {
            "district": "salem",
            "issue": "low_rainfall",
            "goal": "higher_profit",
            "irrigation": "rainfed",
            "season": "rabi",
            "sowing_month": 1,
            "soil_type": "clay",
        }
        with TestClient(app) as client:
            response = client.post(
                "/predict",
                json={
                    **self.payload,
                    "advisory_context": {"farmer_guide": guide_context},
                },
            )

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["advisory_context"]["farmer_guide"], guide_context)
        saved = self.database.list_predictions("prediction-api-test-user")
        self.assertEqual(saved[0]["advisory_context"]["farmer_guide"], guide_context)

    def test_database_initialization_failure_does_not_block_application_startup(self) -> None:
        class FailingInitializationDatabase:
            def initialize(self) -> None:
                raise DatabaseError("test database failure")

        async def exercise_lifespan() -> None:
            with (
                patch.object(backend_main, "validate_production_environment"),
                patch.object(
                    backend_main,
                    "get_database",
                    return_value=FailingInitializationDatabase(),
                ),
                patch.object(backend_main, "load_predictor"),
                patch.object(
                    backend_main,
                    "predictor_status",
                    return_value={"status": "ok"},
                ),
            ):
                async with backend_main.lifespan(None):
                    return

        asyncio.run(exercise_lifespan())
