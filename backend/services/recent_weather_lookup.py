from __future__ import annotations

import copy
import json
import logging
import math
import re
import threading
import time
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from typing import Any

if __package__ and __package__.startswith("backend."):
    from backend.services.local_soil_lookup import validate_coordinates
else:
    from services.local_soil_lookup import validate_coordinates

logger = logging.getLogger(__name__)

NASA_POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_POWER_SOURCE = "NASA POWER Daily API (MERRA-2)"
NASA_POWER_SOURCE_URL = "https://power.larc.nasa.gov/"
NASA_POWER_LICENSE = (
    "NASA Earth science data full-and-open data policy; attribution required."
)
PARAMETERS = {
    "T2M": {
        "output": "temperature",
        "units": "°C",
        "api_units": {"C", "°C"},
        "min": -100,
        "max": 70,
    },
    "RH2M": {
        "output": "humidity",
        "units": "%",
        "api_units": {"%"},
        "min": 0,
        "max": 100,
    },
    "PRECTOTCORR": {
        "output": "rainfall",
        "units": "mm/day",
        "api_units": {"mm/day"},
        "min": 0,
        "max": None,
    },
}
LOOKUP_DAYS = 60
REQUEST_TIMEOUT_SECONDS = 10
CACHE_TTL_SECONDS = 6 * 60 * 60
CACHE_MAX_ENTRIES = 256
FILL_VALUES = {-999, -999.0}
_CACHE: OrderedDict[tuple[float, float, str, str], tuple[float, dict[str, Any]]] = OrderedDict()
_CACHE_LOCK = threading.RLock()


class RecentWeatherError(RuntimeError):
    """Raised when NASA POWER daily weather data cannot be retrieved or validated."""


def _request_period(today: date) -> tuple[date, date]:
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=LOOKUP_DAYS - 1)
    return start_date, end_date


def _cache_key(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> tuple[float, float, str, str]:
    return (
        round(latitude, 2),
        round(longitude, 2),
        start_date.strftime("%Y%m%d"),
        end_date.strftime("%Y%m%d"),
    )


def _finite_value(value: object, fill_value: float) -> float | None:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or float(value) == fill_value
        or float(value) in FILL_VALUES
    ):
        return None
    number = float(value)
    return number


def _parse_response(
    payload: object,
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    retrieved_at: datetime,
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RecentWeatherError("NASA POWER returned a non-object response.")
    properties = payload.get("properties")
    header = payload.get("header")
    parameter_data = properties.get("parameter") if isinstance(properties, dict) else None
    parameter_metadata = payload.get("parameters")
    fill_value = header.get("fill_value", -999) if isinstance(header, dict) else -999
    if (
        not isinstance(parameter_data, dict)
        or not isinstance(parameter_metadata, dict)
        or not isinstance(header, dict)
        or isinstance(fill_value, bool)
        or not isinstance(fill_value, (int, float))
        or not math.isfinite(fill_value)
        or header.get("start") != start_date.strftime("%Y%m%d")
        or header.get("end") != end_date.strftime("%Y%m%d")
        or header.get("time_standard") != "UTC"
    ):
        raise RecentWeatherError(
            "NASA POWER response is missing the requested UTC period or parameter data."
        )

    observations: dict[str, dict[str, Any] | None] = {}
    for parameter, definition in PARAMETERS.items():
        series = parameter_data.get(parameter)
        api_definition = parameter_metadata.get(parameter)
        if not isinstance(series, dict) or not isinstance(api_definition, dict):
            raise RecentWeatherError(
                f"NASA POWER response is missing the {parameter} daily parameter."
            )
        if api_definition.get("units") not in definition["api_units"]:
            raise RecentWeatherError(
                f"NASA POWER returned unexpected units for {parameter}: "
                f"{api_definition.get('units')!r}."
            )
        valid_values: list[tuple[date, float]] = []
        for date_key, raw_value in series.items():
            if not isinstance(date_key, str) or re.fullmatch(r"\d{8}", date_key) is None:
                raise RecentWeatherError(
                    f"NASA POWER returned an invalid date for {parameter}."
                )
            try:
                observation_date = datetime.strptime(date_key, "%Y%m%d").date()
            except ValueError as exc:
                raise RecentWeatherError(
                    f"NASA POWER returned an invalid date for {parameter}."
                ) from exc
            if not start_date <= observation_date <= end_date:
                continue
            value = _finite_value(raw_value, float(fill_value))
            if value is None:
                continue
            if value < definition["min"] or (
                definition["max"] is not None and value > definition["max"]
            ):
                continue
            valid_values.append((observation_date, value))
        if valid_values:
            observation_date, value = max(valid_values, key=lambda item: item[0])
            observations[definition["output"]] = {
                "value": value,
                "units": definition["units"],
                "observation_date": observation_date.isoformat(),
                "data_delay_days": (retrieved_at.date() - observation_date).days,
                "source": NASA_POWER_SOURCE,
                "value_type": "mapped_estimate",
            }
        else:
            observations[definition["output"]] = None

    available_count = sum(value is not None for value in observations.values())
    status = "available" if available_count == len(PARAMETERS) else (
        "partial" if available_count else "no_data"
    )
    dates = [
        date.fromisoformat(value["observation_date"])
        for value in observations.values()
        if value is not None
    ]
    latest_observation_date = max(dates).isoformat() if dates else None
    latest_delay = (
        (retrieved_at.date() - max(dates)).days
        if dates
        else None
    )
    geometry = payload.get("geometry")
    coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    api_coordinates = None
    if (
        isinstance(coordinates, list)
        and len(coordinates) >= 2
        and all(
            not isinstance(value, bool)
            and isinstance(value, (int, float))
            and math.isfinite(value)
            for value in coordinates[:2]
        )
    ):
        api_coordinates = {
            "latitude": float(coordinates[1]),
            "longitude": float(coordinates[0]),
        }

    return {
        "status": status,
        "latitude": latitude,
        "longitude": longitude,
        "dataset_name": NASA_POWER_SOURCE,
        "source": NASA_POWER_SOURCE,
        "source_url": NASA_POWER_SOURCE_URL,
        "license": NASA_POWER_LICENSE,
        "license_url": (
            "https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/"
            "data-information-guidance"
        ),
        "retrieved_at": retrieved_at.isoformat(),
        "requested_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "latest_observation_date": latest_observation_date,
        "data_delay_days": latest_delay,
        "api_coordinates": api_coordinates,
        "grid_resolution_degrees": {"latitude": 0.5, "longitude": 0.625},
        "observations": observations,
        "model_compatible": False,
        "context_only": False,
        "warning": (
            "NASA POWER daily meteorology is a gridded MERRA-2 model/reanalysis estimate, "
            "not a station measurement or necessarily current conditions. The newest "
            "valid observation date is shown; near-real-time data availability varies. "
            "These daily values do not match a documented training aggregation and must "
            "be replaced with compatible values before crop prediction."
        ),
    }


def _request_payload(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> dict[str, Any]:
    query = urlencode({
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": f"{longitude:.2f}",
        "latitude": f"{latitude:.2f}",
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
        "time-standard": "UTC",
    })
    request = Request(
        f"{NASA_POWER_DAILY_URL}?{query}",
        headers={"User-Agent": "SeasonSense-local-weather-lookup/1.0"},
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (TimeoutError, URLError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RecentWeatherError(
            "NASA POWER daily weather lookup failed or timed out."
        ) from exc
    if isinstance(payload, dict) and payload.get("messages"):
        raise RecentWeatherError(
            "NASA POWER reported a problem with the daily weather request."
        )
    return payload


def lookup_recent_weather(
    latitude: float,
    longitude: float,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    validate_coordinates(latitude, longitude)
    retrieved_at = now or datetime.now(timezone.utc)
    if retrieved_at.tzinfo is None:
        raise ValueError("The lookup clock must be timezone-aware.")
    retrieved_at = retrieved_at.astimezone(timezone.utc)
    start_date, end_date = _request_period(retrieved_at.date())
    key = _cache_key(latitude, longitude, start_date, end_date)

    with _CACHE_LOCK:
        cached = _CACHE.get(key)
        if cached and time.monotonic() - cached[0] < CACHE_TTL_SECONDS:
            _CACHE.move_to_end(key)
            result = copy.deepcopy(cached[1])
            result["latitude"] = latitude
            result["longitude"] = longitude
            return result
        if cached:
            del _CACHE[key]

        payload = _request_payload(
            latitude,
            longitude,
            start_date,
            end_date,
        )
        result = _parse_response(
            payload,
            latitude,
            longitude,
            start_date,
            end_date,
            retrieved_at,
        )
        _CACHE[key] = (time.monotonic(), copy.deepcopy(result))
        _CACHE.move_to_end(key)
        while len(_CACHE) > CACHE_MAX_ENTRIES:
            _CACHE.popitem(last=False)
        return result


def clear_recent_weather_cache() -> None:
    with _CACHE_LOCK:
        _CACHE.clear()
