import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.database import PredictionDatabase
from backend.schema import FEATURES


class PredictionDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.database_path = Path(self.temporary_directory.name) / "history.db"
        self.environment = patch.dict(os.environ, {"DATABASE_URL": ""})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.database = PredictionDatabase(database_path=self.database_path)
        self.database.initialize()

    def test_history_and_deletion_are_scoped_to_authenticated_user(self):
        values = {feature: 1.0 for feature in FEATURES}
        self.database.save_prediction(values, "rice", 80.0, "user-a")
        self.database.save_prediction(values, "maize", 70.0, "user-b")

        selections = {
            "language": "en",
            "district": "salem",
            "soil_choice": "black",
            "water_choice": "low",
            "weather_problem": "normal",
            "farmer_goal": "safe",
        }
        result = {
            "model_prediction_available": False,
            "best_crop": None,
            "confidence": None,
        }
        self.database.save_farmer_session(selections, result, "user-a")
        self.database.save_farmer_session(selections, result, "user-b")

        self.assertEqual(len(self.database.list_predictions("user-a")), 1)
        self.assertEqual(len(self.database.list_farmer_sessions("user-a")), 1)
        self.assertEqual(self.database.clear_predictions("user-a"), 2)
        self.assertEqual(self.database.list_predictions("user-a"), [])
        self.assertEqual(self.database.list_farmer_sessions("user-a"), [])
        self.assertEqual(len(self.database.list_predictions("user-b")), 1)
        self.assertEqual(len(self.database.list_farmer_sessions("user-b")), 1)


if __name__ == "__main__":
    unittest.main()
