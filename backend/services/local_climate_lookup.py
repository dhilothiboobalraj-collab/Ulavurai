from __future__ import annotations

import json
import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

if __package__.startswith("backend."):
    from backend.services.local_soil_lookup import validate_coordinates
else:
    from services.local_soil_lookup import validate_coordinates

logger = logging.getLogger(__name__)

CLIMATE_DATASET_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "climate"
    / "nasa_power_monthly_normals_1991_2020.json"
)
EARTH_RADIUS_M = 6_371_000
MONTHS = tuple(f"{month:02d}" for month in range(1, 13))
PARAMETER_FIELDS = (
    "temperature_c",
    "relative_humidity_pct",
    "precipitation_mm_month",
)


class ClimateDatasetError(RuntimeError):
    """Raised when an installed local climate dataset is invalid or unreadable."""


def _distance_m(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    latitude_a_radians = math.radians(latitude_a)
    latitude_b_radians = math.radians(latitude_b)
    delta_latitude = latitude_b_radians - latitude_a_radians
    delta_longitude = math.radians(longitude_b - longitude_a)
    haversine = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(latitude_a_radians)
        * math.cos(latitude_b_radians)
        * math.sin(delta_longitude / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(haversine)))


def _is_finite_number(value: object) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
    )


def _validate_dataset(dataset: object) -> dict[str, Any]:
    if not isinstance(dataset, dict):
        raise ClimateDatasetError("The installed climate dataset must be a JSON object.")
    required_strings = (
        "dataset_name",
        "source",
        "source_url",
        "license",
        "retrieved_at",
        "installed_at",
    )
    if any(
        not isinstance(dataset.get(key), str) or not dataset[key].strip()
        for key in required_strings
    ):
        raise ClimateDatasetError("The installed climate dataset has incomplete provenance.")
    expected_parameters = {
        "T2M": ("temperature_c", "°C"),
        "RH2M": ("relative_humidity_pct", "%"),
        "PRECTOTCORR": ("precipitation_mm_month", "mm/month"),
    }
    parameters = dataset.get("parameters")
    if (
        not isinstance(parameters, dict)
        or dataset.get("monthly_values_are_context_only") is not True
        or any(
            not isinstance(parameters.get(name), dict)
            or parameters[name].get("output") != output
            or parameters[name].get("units") != units
            or not isinstance(parameters[name].get("definition"), str)
            or not parameters[name]["definition"].strip()
            for name, (output, units) in expected_parameters.items()
        )
    ):
        raise ClimateDatasetError(
            "The installed climate dataset has unsupported parameter definitions or units."
        )
    period = dataset.get("reference_period")
    if (
        not isinstance(period, dict)
        or not all(
            isinstance(period.get(key), int) and not isinstance(period.get(key), bool)
            for key in ("start_year", "end_year")
        )
        or period["start_year"] > period["end_year"]
    ):
        raise ClimateDatasetError("The installed climate dataset has an invalid reference period.")
    resolution = dataset.get("grid_resolution_degrees")
    if (
        not isinstance(resolution, dict)
        or not all(
            _is_finite_number(resolution.get(key)) and resolution[key] > 0
            for key in ("latitude", "longitude")
        )
    ):
        raise ClimateDatasetError("The installed climate dataset has invalid grid resolution.")
    max_distance = dataset.get("maximum_match_distance_m")
    cells = dataset.get("cells")
    if (
        not _is_finite_number(max_distance)
        or max_distance <= 0
        or not isinstance(cells, list)
        or not cells
    ):
        raise ClimateDatasetError("The installed climate dataset has no valid grid cells.")

    for cell in cells:
        months = cell.get("months") if isinstance(cell, dict) else None
        if (
            not isinstance(cell, dict)
            or not _is_finite_number(cell.get("latitude"))
            or not _is_finite_number(cell.get("longitude"))
            or not -90 <= cell["latitude"] <= 90
            or not -180 <= cell["longitude"] <= 180
            or not isinstance(months, dict)
            or set(months) != set(MONTHS)
        ):
            raise ClimateDatasetError("The installed climate dataset contains an invalid grid cell.")
        for month in MONTHS:
            values = months[month]
            if not isinstance(values, dict) or any(
                values.get(field) is not None and not _is_finite_number(values[field])
                for field in PARAMETER_FIELDS
            ):
                raise ClimateDatasetError("The installed climate dataset contains invalid monthly values.")
            if (
                values.get("temperature_c") is not None
                and not -100 <= values["temperature_c"] <= 70
            ) or (
                values.get("relative_humidity_pct") is not None
                and not 0 <= values["relative_humidity_pct"] <= 100
            ) or (
                values.get("precipitation_mm_month") is not None
                and values["precipitation_mm_month"] < 0
            ):
                raise ClimateDatasetError("The installed climate dataset contains out-of-range values.")
    return dataset


@lru_cache(maxsize=4)
def _load_cached(path: str, modified_ns: int, size: int) -> dict[str, Any]:
    del modified_ns, size
    try:
        dataset = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        logger.error("Local climate dataset could not be loaded: %s", exc)
        raise ClimateDatasetError(
            "The installed local climate dataset is invalid or unreadable."
        ) from exc
    return _validate_dataset(dataset)


def _load_dataset(path: Path) -> dict[str, Any] | None:
    try:
        stat = path.stat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise ClimateDatasetError("The installed local climate dataset could not be read.") from exc
    return _load_cached(str(path), stat.st_mtime_ns, stat.st_size)


def _unavailable_result(latitude: float, longitude: float, status: str, message: str) -> dict[str, Any]:
    return {
        "status": status,
        "latitude": latitude,
        "longitude": longitude,
        "dataset_name": "NASA POWER meteorological monthly normals",
        "source": "NASA POWER regional monthly service; meteorology from GMAO MERRA-2",
        "source_url": "https://power.larc.nasa.gov/",
        "license": "NASA Earth science data full-and-open data policy; attribution required.",
        "license_url": "https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-information-guidance",
        "reference_period": None,
        "retrieved_at": None,
        "installed_at": None,
        "grid_resolution_degrees": None,
        "grid_location": None,
        "months": {},
        "warning": message,
        "context_only": True,
    }


def lookup_local_climate(
    latitude: float,
    longitude: float,
    *,
    dataset_path: Path | None = None,
) -> dict[str, Any]:
    validate_coordinates(latitude, longitude)
    dataset = _load_dataset(dataset_path or CLIMATE_DATASET_PATH)
    if dataset is None:
        return _unavailable_result(
            latitude,
            longitude,
            "not_installed",
            "No NASA POWER climate dataset is installed; climate fields remain manual.",
        )

    closest = min(
        dataset["cells"],
        key=lambda cell: _distance_m(
            latitude,
            longitude,
            cell["latitude"],
            cell["longitude"],
        ),
    )
    distance = _distance_m(
        latitude,
        longitude,
        closest["latitude"],
        closest["longitude"],
    )
    if distance > dataset["maximum_match_distance_m"]:
        return _unavailable_result(
            latitude,
            longitude,
            "outside_coverage",
            "No installed NASA POWER grid cell is within the documented "
            f"{dataset['maximum_match_distance_m'] / 1000:g} km match limit.",
        )

    months = closest["months"]
    has_values = any(
        any(months[month].get(field) is not None for field in PARAMETER_FIELDS)
        for month in MONTHS
    )
    complete = all(
        all(months[month].get(field) is not None for field in PARAMETER_FIELDS)
        for month in MONTHS
    )
    status = "available" if complete else "partial" if has_values else "no_data"
    return {
        "status": status,
        "latitude": latitude,
        "longitude": longitude,
        "dataset_name": dataset["dataset_name"],
        "source": dataset["source"],
        "source_url": dataset["source_url"],
        "citation": dataset.get("citation", ""),
        "license": dataset["license"],
        "license_url": dataset.get("license_url", ""),
        "reference_period": dataset["reference_period"],
        "retrieved_at": dataset["retrieved_at"],
        "installed_at": dataset["installed_at"],
        "grid_resolution_degrees": dataset["grid_resolution_degrees"],
        "grid_location": {
            "latitude": closest["latitude"],
            "longitude": closest["longitude"],
            "elevation_m": closest.get("elevation_m"),
            "distance_m": round(distance, 1),
            "method": "nearest_grid_cell",
        },
        "months": months,
        "maximum_match_distance_m": dataset["maximum_match_distance_m"],
        "weather_training_period_compatibility": dataset.get(
            "weather_training_period_compatibility",
            "Unknown: the original training CSV does not document weather periods or aggregations.",
        ),
        "warning": (
            "Historical monthly climate normals are grid-cell context, not current weather or field measurements. "
            "They are not inserted into prediction inputs because the training CSV does not document weather periods or aggregations."
        ),
        "context_only": True,
    }
