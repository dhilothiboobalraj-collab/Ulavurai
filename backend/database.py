from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from backend.schema import FEATURES

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = Path(
    os.getenv("DATABASE_PATH", str(PROJECT_ROOT / "predictions.db"))
).expanduser()


class PredictionDatabase:
    def __init__(self, database_path: Path = DATABASE_PATH) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)

    def initialize(self) -> None:
        columns = ", ".join(f'"{feature}" REAL NOT NULL' for feature in FEATURES)
        with closing(sqlite3.connect(self.database_path)) as connection:
            with connection:
                connection.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS predictions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        {columns},
                        predicted_crop TEXT NOT NULL,
                        confidence REAL NOT NULL,
                        user_id TEXT NOT NULL DEFAULT 'legacy'
                    )
                    """
                )
                prediction_columns = {
                    row[1]
                    for row in connection.execute("PRAGMA table_info(predictions)")
                }
                if "interface_type" not in prediction_columns:
                    connection.execute(
                        "ALTER TABLE predictions ADD COLUMN interface_type "
                        "TEXT NOT NULL DEFAULT 'expert'"
                    )
                if "advisory_context_json" not in prediction_columns:
                    connection.execute(
                        "ALTER TABLE predictions ADD COLUMN advisory_context_json "
                        "TEXT NOT NULL DEFAULT '{}'"
                    )
                if "user_id" not in prediction_columns:
                    connection.execute(
                        "ALTER TABLE predictions ADD COLUMN user_id "
                        "TEXT NOT NULL DEFAULT 'legacy'"
                    )
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS farmer_guide_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        interface_type TEXT NOT NULL DEFAULT 'easy_farmer',
                        language TEXT NOT NULL,
                        district TEXT NOT NULL,
                        soil_choice TEXT NOT NULL,
                        water_choice TEXT NOT NULL,
                        weather_problem TEXT NOT NULL,
                        farmer_goal TEXT NOT NULL,
                        model_prediction_available INTEGER NOT NULL,
                        predicted_crop TEXT,
                        confidence REAL,
                        result_json TEXT NOT NULL,
                        user_id TEXT NOT NULL DEFAULT 'legacy'
                    )
                    """
                )
                farmer_columns = {
                    row[1]
                    for row in connection.execute("PRAGMA table_info(farmer_guide_sessions)")
                }
                if "interface_type" not in farmer_columns:
                    connection.execute(
                        "ALTER TABLE farmer_guide_sessions ADD COLUMN interface_type "
                        "TEXT NOT NULL DEFAULT 'easy_farmer'"
                    )
                if "user_id" not in farmer_columns:
                    connection.execute(
                        "ALTER TABLE farmer_guide_sessions ADD COLUMN user_id "
                        "TEXT NOT NULL DEFAULT 'legacy'"
                    )

    def save_prediction(
        self,
        values: dict[str, float],
        predicted_crop: str,
        confidence: float,
        user_id: str,
        advisory_context: dict[str, object] | None = None,
    ) -> None:
        fields = [
            "timestamp",
            *FEATURES,
            "predicted_crop",
            "confidence",
            "interface_type",
            "advisory_context_json",
            "user_id",
        ]
        quoted_fields = ", ".join(f'"{field}"' for field in fields)
        placeholders = ", ".join("?" for _ in fields)
        row = [
            datetime.now(timezone.utc).isoformat(),
            *(values[feature] for feature in FEATURES),
            predicted_crop,
            confidence,
            "expert",
            json.dumps(advisory_context or {}, ensure_ascii=False),
            user_id,
        ]
        with closing(sqlite3.connect(self.database_path)) as connection:
            with connection:
                connection.execute(
                    f"INSERT INTO predictions ({quoted_fields}) VALUES ({placeholders})",
                    row,
                )

    def list_predictions(self, user_id: str) -> list[dict]:
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.row_factory = sqlite3.Row
            rows = connection.execute(
                "SELECT * FROM predictions WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            ).fetchall()
        predictions = []
        for row in rows:
            prediction = dict(row)
            prediction["advisory_context"] = json.loads(
                prediction.pop("advisory_context_json", "{}")
            )
            prediction.pop("prediction_details_json", None)
            predictions.append(prediction)
        return predictions

    def clear_predictions(self, user_id: str) -> int:
        with closing(sqlite3.connect(self.database_path)) as connection:
            with connection:
                predictions = connection.execute(
                    "DELETE FROM predictions WHERE user_id = ?", (user_id,)
                )
                farmer_sessions = connection.execute(
                    "DELETE FROM farmer_guide_sessions WHERE user_id = ?", (user_id,)
                )
                return predictions.rowcount + farmer_sessions.rowcount

    def save_farmer_session(
        self, selections: dict[str, str], result: dict[str, object], user_id: str
    ) -> int:
        with closing(sqlite3.connect(self.database_path)) as connection:
            with connection:
                cursor = connection.execute(
                    """
                    INSERT INTO farmer_guide_sessions (
                        timestamp, language, district, soil_choice, water_choice,
                        weather_problem, farmer_goal, model_prediction_available,
                        predicted_crop, confidence, result_json, user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        datetime.now(timezone.utc).isoformat(),
                        selections["language"],
                        selections["district"],
                        selections["soil_choice"],
                        selections["water_choice"],
                        selections["weather_problem"],
                        selections["farmer_goal"],
                        int(bool(result.get("model_prediction_available"))),
                        result.get("best_crop"),
                        result.get("confidence"),
                        json.dumps(result, ensure_ascii=False),
                        user_id,
                    ),
                )
                if cursor.lastrowid is None:
                    raise RuntimeError("SQLite did not return the saved farmer session ID.")
                return cursor.lastrowid

    def list_farmer_sessions(self, user_id: str) -> list[dict]:
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.row_factory = sqlite3.Row
            rows = connection.execute(
                "SELECT * FROM farmer_guide_sessions WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            ).fetchall()
        sessions = []
        for row in rows:
            session = dict(row)
            session["result"] = json.loads(session.pop("result_json"))
            sessions.append(session)
        return sessions


_database = PredictionDatabase()


def get_database() -> PredictionDatabase:
    return _database
