from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any

if __package__ == "backend":
    from backend.database import PredictionDatabase, get_database
    from backend.schema import FEATURES
else:
    from database import PredictionDatabase, get_database
    from schema import FEATURES


def _value(row: sqlite3.Row, key: str, default: Any) -> Any:
    return row[key] if key in row.keys() and row[key] is not None else default


def migrate_history(source: Path, database: PredictionDatabase) -> tuple[int, int]:
    if not database.database_url:
        raise RuntimeError("Set DATABASE_URL to PostgreSQL before migrating history.")
    if not source.is_file():
        raise FileNotFoundError(f"SQLite history database was not found: {source}")

    database.initialize()
    with sqlite3.connect(source) as sqlite_connection:
        sqlite_connection.row_factory = sqlite3.Row
        tables = {
            row["name"]
            for row in sqlite_connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        if "predictions" not in tables or "farmer_guide_sessions" not in tables:
            raise RuntimeError("The SQLite database does not contain Ulavurai history tables.")
        predictions = sqlite_connection.execute(
            "SELECT * FROM predictions ORDER BY id"
        ).fetchall()
        farmer_sessions = sqlite_connection.execute(
            "SELECT * FROM farmer_guide_sessions ORDER BY id"
        ).fetchall()

    with database._connection() as connection:
        for row in predictions:
            fields = [
                "id",
                "timestamp",
                *FEATURES,
                "predicted_crop",
                "confidence",
                "interface_type",
                "advisory_context_json",
                "user_id",
            ]
            values = (
                row["id"],
                row["timestamp"],
                *(row[feature] for feature in FEATURES),
                row["predicted_crop"],
                row["confidence"],
                _value(row, "interface_type", "expert"),
                _value(row, "advisory_context_json", "{}"),
                _value(row, "user_id", "legacy"),
            )
            quoted_fields = ", ".join(f'"{field}"' for field in fields)
            placeholders = ", ".join("?" for _ in values)
            database._execute(
                connection,
                f"INSERT INTO predictions ({quoted_fields}) VALUES ({placeholders}) "
                "ON CONFLICT (id) DO NOTHING",
                values,
            )

        for row in farmer_sessions:
            fields = (
                "id, timestamp, interface_type, language, district, soil_choice, "
                "water_choice, weather_problem, farmer_goal, model_prediction_available, "
                "predicted_crop, confidence, recommendation_type, result_json, user_id"
            )
            values = (
                row["id"],
                row["timestamp"],
                _value(row, "interface_type", "easy_farmer"),
                row["language"],
                row["district"],
                row["soil_choice"],
                row["water_choice"],
                row["weather_problem"],
                row["farmer_goal"],
                row["model_prediction_available"],
                row["predicted_crop"],
                row["confidence"],
                _value(row, "recommendation_type", "legacy_farmer"),
                row["result_json"],
                _value(row, "user_id", "legacy"),
            )
            placeholders = ", ".join("?" for _ in values)
            database._execute(
                connection,
                f"INSERT INTO farmer_guide_sessions ({fields}) VALUES ({placeholders}) "
                "ON CONFLICT (id) DO NOTHING",
                values,
            )

        for table in ("predictions", "farmer_guide_sessions"):
            database._execute(
                connection,
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE(MAX(id), 1),
                    MAX(id) IS NOT NULL
                )
                FROM {table}
                """,
            )

    return len(predictions), len(farmer_sessions)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Copy Ulavurai history from SQLite into DATABASE_URL PostgreSQL."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "predictions.db",
        help="Path to the existing local predictions.db file.",
    )
    arguments = parser.parse_args()
    prediction_count, farmer_count = migrate_history(
        arguments.source, get_database()
    )
    print(
        f"History copied (existing PostgreSQL IDs were preserved): "
        f"{prediction_count} Expert records, {farmer_count} Farmer Guide sessions."
    )


if __name__ == "__main__":
    main()
