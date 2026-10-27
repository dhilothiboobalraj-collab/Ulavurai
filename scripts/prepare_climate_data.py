from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import math
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_DIRECTORY = ROOT / "backend" / "data" / "climate"
DOWNLOAD_DIRECTORY = DATA_DIRECTORY / "downloads"
OUTPUT_PATH = DATA_DIRECTORY / "nasa_power_monthly_normals_1991_2020.json"
API_URL = "https://power.larc.nasa.gov/api/temporal/monthly/regional"
PARAMETERS = {
    "T2M": "temperature_c",
    "RH2M": "relative_humidity_pct",
    "PRECTOTCORR": "precipitation_mm_day",
}
REGION = {
    "latitude-min": 7.5,
    "latitude-max": 14.5,
    "longitude-min": 75.5,
    "longitude-max": 82.5,
}
START_YEAR = 1991
END_YEAR = 2020
MIN_VALID_YEARS = 27


def _validate_parameter_response(payload: object, parameter: str, *, path: Path) -> dict[str, Any]:
    if not isinstance(payload, dict) or not isinstance(payload.get("features"), list) or not payload["features"]:
        raise RuntimeError(f"NASA POWER response has no regional features for {parameter}: {path}")
    for feature in payload["features"]:
        try:
            coordinates = feature["geometry"]["coordinates"]
            values = feature["properties"]["parameter"][parameter]
        except (KeyError, TypeError) as exc:
            raise RuntimeError(f"NASA POWER response is missing {parameter} grid data: {path}") from exc
        if (
            not isinstance(coordinates, list)
            or len(coordinates) < 3
            or any(
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(float(value))
                for value in coordinates[:3]
            )
            or not REGION["longitude-min"] <= coordinates[0] <= REGION["longitude-max"]
            or not REGION["latitude-min"] <= coordinates[1] <= REGION["latitude-max"]
            or not isinstance(values, dict)
            or not any(
                isinstance(key, str)
                and len(key) == 6
                and key.isdigit()
                and START_YEAR <= int(key[:4]) <= END_YEAR
                and 1 <= int(key[4:]) <= 12
                for key in values
            )
        ):
            raise RuntimeError(f"NASA POWER response contains invalid {parameter} grid data: {path}")
    return payload


def _read_cached_response(path: Path, parameter: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cached NASA POWER response is invalid: {path}") from exc
    return _validate_parameter_response(payload, parameter, path=path)


def _write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    ) as stream:
        temporary_path = Path(stream.name)
        json.dump(payload, stream, separators=(",", ":"), allow_nan=False)
        stream.write("\n")
    os.replace(temporary_path, path)


def _download_parameter(
    parameter: str,
    cache_directory: Path,
) -> tuple[dict[str, Any], str, str]:
    path = cache_directory / f"{parameter}_{START_YEAR}_{END_YEAR}.json"
    metadata_path = path.with_suffix(".metadata.json")
    if path.is_file():
        payload = _read_cached_response(path, parameter)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if metadata_path.is_file():
            try:
                cached_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
                cached_at = cached_metadata["retrieved_at"]
                if (
                    cached_metadata.get("sha256") != digest
                    or not isinstance(cached_at, str)
                ):
                    raise ValueError("Cache metadata does not match the cached response.")
                datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
            except (OSError, UnicodeError, json.JSONDecodeError, KeyError, ValueError) as exc:
                raise RuntimeError(
                    f"Cached NASA POWER provenance is invalid: {metadata_path}"
                ) from exc
        else:
            cached_at = datetime.fromtimestamp(
                path.stat().st_mtime,
                timezone.utc,
            ).isoformat(timespec="seconds")
            _write_json_atomic(
                metadata_path,
                {"sha256": digest, "retrieved_at": cached_at},
            )
        return payload, digest, cached_at

    query = {
        **REGION,
        "parameters": parameter,
        "community": "AG",
        "start": START_YEAR,
        "end": END_YEAR,
        "format": "JSON",
    }
    request = Request(
        f"{API_URL}?{urlencode(query)}",
        headers={"User-Agent": "SeasonSense-local-climate-installer/1.0"},
    )
    partial_path = path.with_suffix(".json.part")
    try:
        with urlopen(request, timeout=180) as response:
            data = response.read()
        payload = json.loads(data)
    except (OSError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(
            f"NASA POWER download failed for {parameter}; rerun the installer to retry it."
        ) from exc

    payload = _validate_parameter_response(payload, parameter, path=partial_path)

    cache_directory.mkdir(parents=True, exist_ok=True)
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    try:
        partial_path.write_bytes(data)
        os.replace(partial_path, path)
    finally:
        if partial_path.exists():
            partial_path.unlink()
    digest = hashlib.sha256(data).hexdigest()
    _write_json_atomic(
        metadata_path,
        {"sha256": digest, "retrieved_at": retrieved_at},
    )
    return payload, digest, retrieved_at


def _number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if not math.isfinite(number) or number <= -900:
        return None
    return number


def _parameter_cells(payload: dict[str, Any], parameter: str) -> dict[tuple[float, float], dict[int, list[tuple[int, float]]]]:
    cells: dict[tuple[float, float], dict[int, list[tuple[int, float]]]] = {}
    for feature in payload["features"]:
        try:
            coordinates = feature["geometry"]["coordinates"]
            longitude, latitude, elevation = coordinates[:3]
            values = feature["properties"]["parameter"][parameter]
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError(f"NASA POWER returned malformed {parameter} grid data.") from exc
        if (
            any(isinstance(item, bool) or not isinstance(item, (int, float)) for item in (latitude, longitude, elevation))
            or not all(math.isfinite(float(item)) for item in (latitude, longitude, elevation))
            or not isinstance(values, dict)
        ):
            raise RuntimeError(f"NASA POWER returned invalid {parameter} grid coordinates.")
        coordinate_key = (round(float(latitude), 6), round(float(longitude), 6))
        month_values: dict[int, list[tuple[int, float]]] = {month: [] for month in range(1, 13)}
        for date_key, raw_value in values.items():
            if not isinstance(date_key, str) or len(date_key) != 6 or not date_key.isdigit():
                continue
            year, month = int(date_key[:4]), int(date_key[4:])
            if not START_YEAR <= year <= END_YEAR or not 1 <= month <= 12:
                continue
            value = _number(raw_value)
            if value is not None and (
                (parameter == "T2M" and not -100 <= value <= 70)
                or (parameter == "RH2M" and not 0 <= value <= 100)
                or (parameter == "PRECTOTCORR" and value < 0)
            ):
                value = None
            if value is not None:
                month_values[month].append((year, value))
        if coordinate_key in cells:
            raise RuntimeError(f"NASA POWER returned a duplicate {parameter} grid cell.")
        cells[coordinate_key] = month_values
    return cells


def build_climate_dataset(
    responses: dict[str, dict[str, Any]],
    *,
    retrieved_at: str,
    installed_at: str | None = None,
) -> dict[str, Any]:
    parameter_cells = {
        name: _parameter_cells(response, name)
        for name, response in responses.items()
    }
    coordinate_sets = [set(cells) for cells in parameter_cells.values()]
    if not coordinate_sets or any(coordinates != coordinate_sets[0] for coordinates in coordinate_sets[1:]):
        raise RuntimeError("NASA POWER parameter downloads do not share the same grid cells.")

    records = []
    for latitude, longitude in sorted(coordinate_sets[0]):
        source_features = {
            parameter: next(
                feature
                for feature in responses[parameter]["features"]
                if round(float(feature["geometry"]["coordinates"][1]), 6) == latitude
                and round(float(feature["geometry"]["coordinates"][0]), 6) == longitude
            )
            for parameter in PARAMETERS
        }
        elevations = [
            float(feature["geometry"]["coordinates"][2])
            for feature in source_features.values()
        ]
        if max(elevations) - min(elevations) > 0.01:
            raise RuntimeError("NASA POWER returned inconsistent elevations for a grid cell.")
        monthly_normals = {}
        for month in range(1, 13):
            month_record: dict[str, float | int | None] = {}
            for parameter, output_name in PARAMETERS.items():
                samples = parameter_cells[parameter][(latitude, longitude)][month]
                if parameter == "PRECTOTCORR":
                    if len(samples) < MIN_VALID_YEARS:
                        value = None
                    else:
                        value = sum(
                            daily_rate * calendar.monthrange(year, month)[1]
                            for year, daily_rate in samples
                        ) / len(samples)
                    month_record["precipitation_valid_years"] = len(samples)
                else:
                    value = (
                        sum(sample for _, sample in samples) / len(samples)
                        if len(samples) >= MIN_VALID_YEARS
                        else None
                    )
                    month_record[f"{output_name}_valid_years"] = len(samples)
                month_record[
                    "precipitation_mm_month" if parameter == "PRECTOTCORR" else output_name
                ] = round(value, 3) if value is not None else None
            monthly_normals[f"{month:02d}"] = month_record
        records.append({
            "latitude": latitude,
            "longitude": longitude,
            "elevation_m": round(sum(elevations) / len(elevations), 2),
            "months": monthly_normals,
        })

    if not records:
        raise RuntimeError("NASA POWER returned no usable cells for the requested region.")
    return {
        "dataset_name": "NASA POWER meteorological monthly normals",
        "source": "NASA POWER regional monthly service; meteorology from GMAO MERRA-2",
        "source_url": "https://power.larc.nasa.gov/",
        "api_url": API_URL,
        "citation": "NASA POWER Project. Monthly meteorological data derived from GMAO MERRA-2. https://power.larc.nasa.gov/",
        "license": "NASA Earth science data are shared under NASA's full-and-open data policy; cite NASA POWER and its source dataset. Do not imply NASA endorsement.",
        "license_url": "https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-information-guidance",
        "parameters": {
            "T2M": {"output": "temperature_c", "units": "°C", "definition": "Monthly mean 2 m air temperature."},
            "RH2M": {"output": "relative_humidity_pct", "units": "%", "definition": "Monthly mean 2 m relative humidity."},
            "PRECTOTCORR": {
                "output": "precipitation_mm_month",
                "units": "mm/month",
                "definition": "Monthly mean of monthly accumulations, calculated from the NASA POWER monthly mean daily precipitation rate (mm/day) times calendar days in each month.",
            },
        },
        "reference_period": {"start_year": START_YEAR, "end_year": END_YEAR},
        "retrieved_at": retrieved_at,
        "installed_at": installed_at or retrieved_at,
        "coverage": {
            "requested_wgs84_bbox": REGION,
            "actual_grid_cells": len(records),
            "latitude_min": min(record["latitude"] for record in records),
            "latitude_max": max(record["latitude"] for record in records),
            "longitude_min": min(record["longitude"] for record in records),
            "longitude_max": max(record["longitude"] for record in records),
        },
        "grid_resolution_degrees": {"latitude": 0.5, "longitude": 0.625},
        "maximum_match_distance_m": 50_000,
        "monthly_values_are_context_only": True,
        "weather_training_period_compatibility": (
            "Unknown: the original crop training CSV does not document weather periods or aggregations."
        ),
        "download_checksums_sha256": {},
        "cells": records,
    }


def install(output_path: Path = OUTPUT_PATH, *, cache_directory: Path = DOWNLOAD_DIRECTORY) -> Path:
    responses = {}
    checksums = {}
    retrieval_times = {}
    for parameter in PARAMETERS:
        print(f"Downloading NASA POWER parameter {parameter} ({START_YEAR}-{END_YEAR})...")
        payload, digest, retrieved_at = _download_parameter(parameter, cache_directory)
        responses[parameter] = payload
        checksums[parameter] = digest
        retrieval_times[parameter] = retrieved_at
    installed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    dataset = build_climate_dataset(
        responses,
        retrieved_at=max(retrieval_times.values()),
        installed_at=installed_at,
    )
    dataset["download_checksums_sha256"] = checksums
    dataset["parameter_retrieval_times"] = retrieval_times
    _write_json_atomic(output_path, dataset)
    print(f"Installed {len(dataset['cells'])} grid cells at {output_path}")
    print("Completed parameter downloads are cached; rerunning resumes at the first missing parameter.")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Explicitly download and install NASA POWER historical monthly climate normals."
    )
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--cache-directory", type=Path, default=DOWNLOAD_DIRECTORY)
    args = parser.parse_args()
    install(args.output, cache_directory=args.cache_directory)


if __name__ == "__main__":
    main()
