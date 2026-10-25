from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

import psycopg

if __package__ == "backend":
    from backend.schema import FEATURES
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
else:
    from schema import FEATURES
    PROJECT_ROOT = Path(__file__).resolve().parent

DATABASE_PATH = Path(
    os.getenv("DATABASE_PATH", str(PROJECT_ROOT / "predictions.db"))
).expanduser()


class DatabaseError(RuntimeError):
    """Raised when a configured history database operation fails."""


class PredictionDatabase:
    """Use PostgreSQL when DATABASE_URL is set; otherwise use local SQLite."""

    def __init__(
        self, database_path: Path = DATABASE_PATH, database_url: str | None = None
    ) -> None:
        self.database_path = database_path
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            self.database_path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def _connection(self) -> Generator[Any, None, None]:
        try:
            if self.database_url:
                with psycopg.connect(self.database_url) as connection:
                    yield connection
            else:
                connection = sqlite3.connect(self.database_path)
                connection.row_factory = sqlite3.Row
                try:
                    with connection:
                        yield connection
                finally:
                    connection.close()
        except (sqlite3.Error, psycopg.Error) as exc:
            raise DatabaseError("Database operation failed.") from exc

    def _execute(
        self, connection: Any, statement: str, values: tuple[Any, ...] = ()
    ) -> Any:
        if self.database_url:
            statement = statement.replace("?", "%s")
        return connection.execute(statement, values)

    def _fetch_dicts(self, cursor: Any) -> list[dict[str, Any]]:
        rows = cursor.fetchall()
        if self.database_url:
            names = [column.name for column in cursor.description]
            return [dict(zip(names, row, strict=True)) for row in rows]
        return [dict(row) for row in rows]

    def initialize(self) -> None:
        id_type = "BIGSERIAL" if self.database_url else "INTEGER"
        primary_key = (
            "BIGSERIAL PRIMARY KEY"
            if self.database_url
            else "INTEGER PRIMARY KEY AUTOINCREMENT"
        )
        numeric_type = "DOUBLE PRECISION" if self.database_url else "REAL"
        feature_columns = ", ".join(
            f'"{feature}" {numeric_type} NOT NULL' for feature in FEATURES
        )

        with self._connection() as connection:
            self._execute(
                connection,
                f"""
                CREATE TABLE IF NOT EXISTS predictions (
                    id {primary_key},
                    timestamp TEXT NOT NULL,
                    {feature_columns},
                    predicted_crop TEXT NOT NULL,
                    confidence {numeric_type} NOT NULL,
                    interface_type TEXT NOT NULL DEFAULT 'expert',
                    advisory_context_json TEXT NOT NULL DEFAULT '{{}}',
                    user_id TEXT NOT NULL DEFAULT 'legacy'
                )
                """,
            )
            self._ensure_columns(
                connection,
                "predictions",
                {
                    "interface_type": "TEXT NOT NULL DEFAULT 'expert'",
                    "advisory_context_json": "TEXT NOT NULL DEFAULT '{}'",
                    "user_id": "TEXT NOT NULL DEFAULT 'legacy'",
                },
            )
            self._execute(
                connection,
                f"""
                CREATE TABLE IF NOT EXISTS farmer_guide_sessions (
                    id {id_type} PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    interface_type TEXT NOT NULL DEFAULT 'easy_farmer',
                    language TEXT NOT NULL,
                    district TEXT NOT NULL,
                    soil_choice TEXT NOT NULL,
                    water_choice TEXT NOT NULL,
                    weather_problem TEXT NOT NULL,
                    farmer_goal TEXT NOT NULL,
                    model_prediction_available SMALLINT NOT NULL,
                    predicted_crop TEXT,
                    confidence {numeric_type},
                    recommendation_type TEXT NOT NULL DEFAULT 'legacy_farmer',
                    result_json TEXT NOT NULL,
                    user_id TEXT NOT NULL DEFAULT 'legacy'
                )
                """,
            )
            self._ensure_columns(
                connection,
                "farmer_guide_sessions",
                {
                    "interface_type": "TEXT NOT NULL DEFAULT 'easy_farmer'",
                    "recommendation_type": "TEXT NOT NULL DEFAULT 'legacy_farmer'",
                    "user_id": "TEXT NOT NULL DEFAULT 'legacy'",
                },
            )

    def _ensure_columns(
        self,
        connection: Any,
        table: str,
        columns: dict[str, str],
    ) -> None:
        if self.database_url:
            existing = {
                row["column_name"]
                for row in self._fetch_dicts(
                    self._execute(
                        connection,
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema() AND table_name = ?
                        """,
                        (table,),
                    )
                )
            }
        else:
            existing = {
                row["name"]
                for row in self._execute(
                    connection, f"PRAGMA table_info({table})"
                ).fetchall()
            }

        for name, definition in columns.items():
            if name in existing:
                continue
            if self.database_url:
                self._execute(
                    connection,
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS "
                    f"{name} {definition}",
                )
            else:
                self._execute(
                    connection,
                    f"ALTER TABLE {table} ADD COLUMN {name} {definition}",
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
        row = (
            datetime.now(timezone.utc).isoformat(),
            *(values[feature] for feature in FEATURES),
            predicted_crop,
            confidence,
            "expert",
            json.dumps(advisory_context or {}, ensure_ascii=False),
            user_id,
        )
        with self._connection() as connection:
            self._execute(
                connection,
                f"INSERT INTO predictions ({quoted_fields}) VALUES ({placeholders})",
                row,
            )

    def list_predictions(self, user_id: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._fetch_dicts(
                self._execute(
                    connection,
                    "SELECT * FROM predictions WHERE user_id = ? ORDER BY id DESC",
                    (user_id,),
                )
            )
        predictions = []
        for prediction in rows:
            prediction["advisory_context"] = json.loads(
                prediction.pop("advisory_context_json", "{}")
            )
            prediction.pop("prediction_details_json", None)
            predictions.append(prediction)
        return predictions

    def clear_predictions(self, user_id: str) -> int:
        with self._connection() as connection:
            predictions = self._execute(
                connection, "DELETE FROM predictions WHERE user_id = ?", (user_id,)
            )
            farmer_sessions = self._execute(
                connection,
                "DELETE FROM farmer_guide_sessions WHERE user_id = ?",
                (user_id,),
            )
            return predictions.rowcount + farmer_sessions.rowcount

    def save_farmer_session(
        self,
        selections: dict[str, str],
        result: dict[str, object],
        user_id: str,
    ) -> int:
        fields = (
            "timestamp, interface_type, language, district, soil_choice, "
            "water_choice, weather_problem, farmer_goal, "
            "model_prediction_available, predicted_crop, confidence, "
            "recommendation_type, result_json, user_id"
        )
        row = (
            datetime.now(timezone.utc).isoformat(),
            "easy_farmer",
            selections["language"],
            selections["district"],
            selections["soil_choice"],
            selections["water_choice"],
            selections["weather_problem"],
            selections["farmer_goal"],
            int(bool(result.get("model_prediction_available"))),
            result.get("best_crop"),
            result.get("confidence"),
            "farmer_model"
            if result.get("model_prediction_available")
            else "situation_guidance",
            json.dumps(result, ensure_ascii=False),
            user_id,
        )
        placeholders = ", ".join("?" for _ in row)
        with self._connection() as connection:
            statement = (
                f"INSERT INTO farmer_guide_sessions ({fields}) "
                f"VALUES ({placeholders})"
            )
            if self.database_url:
                session_id = self._execute(
                    connection, f"{statement} RETURNING id", row
                ).fetchone()[0]
            else:
                session_id = self._execute(connection, statement, row).lastrowid
        if session_id is None:
            raise DatabaseError("Database did not return the saved session ID.")
        return int(session_id)

    def list_farmer_sessions(self, user_id: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._fetch_dicts(
                self._execute(
                    connection,
                    "SELECT * FROM farmer_guide_sessions "
                    "WHERE user_id = ? ORDER BY id DESC",
                    (user_id,),
                )
            )
        sessions = []
        for session in rows:
            session["result"] = json.loads(session.pop("result_json"))
            sessions.append(session)
        return sessions


_database = PredictionDatabase()


def get_database() -> PredictionDatabase:
    return _database
