from __future__ import annotations

import json
import logging
import math
import threading
import time
from collections import OrderedDict
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from typing import Any

if __package__.startswith("backend."):
    from backend.services.local_soil_lookup import validate_coordinates
else:
    from services.local_soil_lookup import validate_coordinates

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_SOURCE = "Open-Meteo Forecast API (Best Match)"
OPEN_METEO_LICENSE = "CC BY 4.0"
_CACHE_TTL_SECONDS = 300
_CACHE_MAX_ITEMS = 512
_CACHE_LOCK = threading.Lock()
_WEATHER_CACHE: OrderedDict[
    tuple[float, float], tuple[float, dict[str, Any]]
] = OrderedDict()

_CURRENT_PROPERTIES = {
    "temperature_2m": ("Air temperature at 2 m", "°C"),
    "relative_humidity_2m": ("Relative humidity at 2 m", "%"),
    "precipitation": ("Precipitation in preceding interval", "mm"),
    "soil_temperature_0cm": ("Surface soil temperature", "°C"),
    "soil_moisture_0_to_1cm": ("Soil moisture at 0–1 cm", "m³/m³"),
}


class WeatherProviderError(RuntimeError):
    """Raised when the public weather provider response cannot be used."""


def _read_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    query = urlencode({
        "latitude": f"{latitude:.3f}",
        "longitude": f"{longitude:.3f}",
        "current": ",".join(_CURRENT_PROPERTIES),
        "timezone": "auto",
    })
    request = Request(
        f"{OPEN_METEO_URL}?{query}",
        headers={"Accept": "application/json", "User-Agent": "Ulavurai/1.0"},
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read())
    except HTTPError as exc:
        logger.warning("Open-Meteo request returned HTTP %s.", exc.code)
        if exc.code == 429:
            raise WeatherProviderError(
                "The weather service is rate-limited; try again in a few minutes."
            ) from exc
        raise WeatherProviderError(
            "The public weather service is temporarily unavailable."
        ) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Open-Meteo request failed: %s", type(exc).__name__)
        raise WeatherProviderError(
            "The public weather service could not be reached."
        ) from exc

    if not isinstance(payload, dict):
        raise WeatherProviderError("The weather service returned an invalid response.")
    current = payload.get("current")
    current_units = payload.get("current_units")
    if not isinstance(current, dict) or not isinstance(current_units, dict):
        raise WeatherProviderError("The weather service returned incomplete current conditions.")

    if not isinstance(current.get("time"), str) or not current["time"]:
        raise WeatherProviderError("The weather service omitted its time period.")
    interval = current.get("interval")
    if isinstance(interval, bool) or not isinstance(interval, int) or interval <= 0:
        raise WeatherProviderError("The weather service returned an invalid time interval.")
    for key in _CURRENT_PROPERTIES:
        if key not in current or key not in current_units:
            raise WeatherProviderError("The weather service omitted a requested property.")
        value = current[key]
        if value is not None and (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise WeatherProviderError("The weather service returned an invalid property value.")

    return payload


def _get_cached_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    cache_key = (round(latitude, 3), round(longitude, 3))
    now = time.monotonic()
    with _CACHE_LOCK:
        cached = _WEATHER_CACHE.get(cache_key)
        if cached and now - cached[0] < _CACHE_TTL_SECONDS:
            _WEATHER_CACHE.move_to_end(cache_key)
            return cached[1]
        if cached:
            del _WEATHER_CACHE[cache_key]

    payload = _read_current_weather(*cache_key)
    with _CACHE_LOCK:
        _WEATHER_CACHE[cache_key] = (time.monotonic(), payload)
        _WEATHER_CACHE.move_to_end(cache_key)
        while len(_WEATHER_CACHE) > _CACHE_MAX_ITEMS:
            _WEATHER_CACHE.popitem(last=False)
    return payload


def lookup_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    validate_coordinates(latitude, longitude)
    try:
        payload = _get_cached_current_weather(latitude, longitude)
    except WeatherProviderError as exc:
        return {
            "status": "unavailable",
            "source": OPEN_METEO_SOURCE,
            "license": OPEN_METEO_LICENSE,
            "source_url": "https://open-meteo.com/",
            "license_url": "https://open-meteo.com/en/licence",
            "properties": {},
            "unavailable_properties": list(_CURRENT_PROPERTIES),
            "location": None,
            "warnings": [str(exc)],
        }

    current = payload["current"]
    current_units = payload["current_units"]
    interval_seconds = current["interval"]
    properties = {}
    unavailable = []
    for name, (label, _) in _CURRENT_PROPERTIES.items():
        value = current[name]
        if value is None:
            unavailable.append(name)
            continue
        temporal_definition = (
            f"Accumulated over the preceding {interval_seconds} seconds."
            if name == "precipitation"
            else "Current model-derived condition."
        )
        properties[name] = {
            "label": label,
            "value": value,
            "units": current_units[name],
            "value_type": "modelled_estimate",
            "source": OPEN_METEO_SOURCE,
            "time": current["time"],
            "temporal_definition": temporal_definition,
        }

    location = {}
    for output_name, payload_name in (
        ("latitude", "latitude"),
        ("longitude", "longitude"),
        ("elevation_m", "elevation"),
    ):
        value = payload.get(payload_name)
        if value is not None and (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise WeatherProviderError("The weather service returned invalid grid metadata.")
        location[output_name] = value
    timezone = payload.get("timezone")
    if timezone is not None and not isinstance(timezone, str):
        raise WeatherProviderError("The weather service returned invalid timezone metadata.")
    location["timezone"] = timezone
    available = bool(properties)
    return {
        "status": "unavailable" if not available else "partial" if unavailable else "available",
        "source": OPEN_METEO_SOURCE,
        "license": OPEN_METEO_LICENSE,
        "source_url": "https://open-meteo.com/",
        "license_url": "https://open-meteo.com/en/licence",
        "properties": properties,
        "unavailable_properties": unavailable,
        "retrieved_at": current["time"],
        "interval_seconds": interval_seconds,
        "grid_location": location,
        "warnings": [
            "Weather values are gridded model estimates, not on-farm sensor observations.",
            "Current temperature, humidity, and preceding-interval precipitation are context only; they are not the seasonal conditions expected by the crop model.",
            "Weather data has not been used to populate Random Forest inputs.",
        ],
    }


def clear_weather_cache() -> None:
    with _CACHE_LOCK:
        _WEATHER_CACHE.clear()
