from __future__ import annotations

import json
import os
import sqlite3
<<<<<<< HEAD
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
=======
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

import psycopg

from schema import FEATURES

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = PROJECT_ROOT / "predictions.db"


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
            raise DatabaseError(f"Database operation failed: {exc}") from exc

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
        identifier = "BIGSERIAL" if self.database_url else "INTEGER"
        primary_key = (
            "BIGSERIAL PRIMARY KEY"
            if self.database_url
            else "INTEGER PRIMARY KEY AUTOINCREMENT"
        )
        columns = ", ".join(
            f'"{feature}" {"DOUBLE PRECISION" if self.database_url else "REAL"} NOT NULL'
            for feature in FEATURES
        )
        with self._connection() as connection:
            self._execute(
                connection,
                f"""
                CREATE TABLE IF NOT EXISTS predictions (
                    id {primary_key},
                    timestamp TEXT NOT NULL,
                    {columns},
                    predicted_crop TEXT NOT NULL,
                    confidence {"DOUBLE PRECISION" if self.database_url else "REAL"} NOT NULL
                )
                """,
            )
            if self.database_url:
                for column, definition in (
                    ("interface_type", "TEXT NOT NULL DEFAULT 'expert'"),
                    ("advisory_context_json", "TEXT NOT NULL DEFAULT '{}'"),
                ):
                    self._execute(
                        connection,
                        f"ALTER TABLE predictions ADD COLUMN IF NOT EXISTS "
                        f"{column} {definition}",
                    )
                self._execute(
                    connection,
                    f"""
                    CREATE TABLE IF NOT EXISTS farmer_guide_sessions (
                        id {identifier} PRIMARY KEY,
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
                        confidence DOUBLE PRECISION,
                        recommendation_type TEXT NOT NULL DEFAULT 'legacy_farmer',
                        result_json TEXT NOT NULL
                    )
                    """,
                )
                for column, definition in (
                    ("interface_type", "TEXT NOT NULL DEFAULT 'easy_farmer'"),
                    ("recommendation_type", "TEXT NOT NULL DEFAULT 'legacy_farmer'"),
                ):
                    self._execute(
                        connection,
                        f"ALTER TABLE farmer_guide_sessions ADD COLUMN IF NOT EXISTS "
                        f"{column} {definition}",
                    )
            else:
                prediction_columns = {
                    row["name"]
                    for row in self._execute(
                        connection, "PRAGMA table_info(predictions)"
                    ).fetchall()
                }
                if "interface_type" not in prediction_columns:
                    self._execute(
                        connection,
                        "ALTER TABLE predictions ADD COLUMN interface_type "
                        "TEXT NOT NULL DEFAULT 'expert'",
                    )
                if "advisory_context_json" not in prediction_columns:
                    self._execute(
                        connection,
                        "ALTER TABLE predictions ADD COLUMN advisory_context_json "
                        "TEXT NOT NULL DEFAULT '{}'",
                    )
                self._execute(
                    connection,
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
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
<<<<<<< HEAD
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
=======
                        recommendation_type TEXT NOT NULL DEFAULT 'legacy_farmer',
                        result_json TEXT NOT NULL
                    )
                    """,
                )
                farmer_columns = {
                    row["name"]
                    for row in self._execute(
                        connection, "PRAGMA table_info(farmer_guide_sessions)"
                    ).fetchall()
                }
                if "interface_type" not in farmer_columns:
                    self._execute(
                        connection,
                        "ALTER TABLE farmer_guide_sessions ADD COLUMN "
                        "interface_type TEXT NOT NULL DEFAULT 'easy_farmer'",
                    )
                if "recommendation_type" not in farmer_columns:
                    self._execute(
                        connection,
                        "ALTER TABLE farmer_guide_sessions ADD COLUMN "
                        "recommendation_type TEXT NOT NULL DEFAULT 'legacy_farmer'",
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
                    )

    def save_prediction(
        self,
        values: dict[str, float],
        predicted_crop: str,
        confidence: float,
<<<<<<< HEAD
        user_id: str,
=======
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
        advisory_context: dict[str, object] | None = None,
    ) -> None:
        fields = [
            "timestamp",
            *FEATURES,
            "predicted_crop",
            "confidence",
            "interface_type",
            "advisory_context_json",
<<<<<<< HEAD
            "user_id",
        ]
        quoted_fields = ", ".join(f'"{field}"' for field in fields)
        placeholders = ", ".join("?" for _ in fields)
        row = [
=======
        ]
        quoted_fields = ", ".join(f'"{field}"' for field in fields)
        placeholders = ", ".join("?" for _ in fields)
        row = (
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
            datetime.now(timezone.utc).isoformat(),
            *(values[feature] for feature in FEATURES),
            predicted_crop,
            confidence,
            "expert",
            json.dumps(advisory_context or {}, ensure_ascii=False),
<<<<<<< HEAD
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
=======
        )
        with self._connection() as connection:
            self._execute(
                connection,
                f"INSERT INTO predictions ({quoted_fields}) VALUES ({placeholders})",
                row,
            )

    def list_predictions(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._fetch_dicts(
                self._execute(connection, "SELECT * FROM predictions ORDER BY id DESC")
            )
        predictions = []
        for row in rows:
            prediction = row
            prediction["advisory_context"] = json.loads(
                prediction.pop("advisory_context_json", "{}")
            )
            predictions.append(prediction)
        return predictions

    def clear_predictions(self) -> int:
        with self._connection() as connection:
            predictions = self._execute(connection, "DELETE FROM predictions")
            farmer_sessions = self._execute(
                connection, "DELETE FROM farmer_guide_sessions"
            )
            return predictions.rowcount + farmer_sessions.rowcount

    def save_farmer_session(
        self, selections: dict[str, str], result: dict[str, object]
    ) -> int:
        fields = (
            "timestamp, language, district, soil_choice, water_choice, "
            "weather_problem, farmer_goal, model_prediction_available, "
            "predicted_crop, confidence, recommendation_type, result_json"
        )
        row = (
            datetime.now(timezone.utc).isoformat(),
            selections["language"],
            selections["district"],
            selections["soil_choice"],
            selections["water_choice"],
            selections["weather_problem"],
            selections["farmer_goal"],
            int(bool(result.get("model_prediction_available"))),
            result.get("recommended_crop") or result.get("best_crop"),
            result.get("confidence"),
            result.get("recommendation_type")
            or (
                "farmer_model"
                if result.get("model_prediction_available")
                else "situation_guidance"
            ),
            json.dumps(result, ensure_ascii=False),
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
            raise DatabaseError("The database did not return the saved farmer session ID.")
        return int(session_id)

    def list_farmer_sessions(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._fetch_dicts(
                self._execute(
                    connection, "SELECT * FROM farmer_guide_sessions ORDER BY id DESC"
                )
            )
        sessions = []
        for row in rows:
            session = row
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
            session["result"] = json.loads(session.pop("result_json"))
            sessions.append(session)
        return sessions


_database = PredictionDatabase()


def get_database() -> PredictionDatabase:
    return _database
