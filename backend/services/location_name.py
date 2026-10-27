from __future__ import annotations

import json
import logging
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

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
_CACHE_MAX_ITEMS = 512
_MIN_REQUEST_INTERVAL_SECONDS = 1.0
_CACHE_LOCK = threading.Lock()
_REQUEST_LOCK = threading.Lock()
_CACHE: OrderedDict[tuple[float, float], tuple[float, dict[str, Any]]] = OrderedDict()
_LAST_REQUEST_AT = 0.0


class LocationNameError(RuntimeError):
    """Raised when the public reverse-geocoding service cannot be used."""


def _label_from_address(payload: dict[str, Any]) -> str | None:
    address = payload.get("address")
    if isinstance(address, dict):
        primary = next(
            (
                address[key]
                for key in (
                    "village",
                    "town",
                    "city",
                    "hamlet",
                    "municipality",
                    "suburb",
                    "county",
                )
                if isinstance(address.get(key), str) and address[key].strip()
            ),
            None,
        )
        secondary = next(
            (
                address[key]
                for key in ("state", "country")
                if isinstance(address.get(key), str) and address[key].strip()
            ),
            None,
        )
        if primary and secondary and primary.casefold() != secondary.casefold():
            return f"{primary}, {secondary}"
        if primary:
            return primary

    display_name = payload.get("display_name")
    return display_name.strip() if isinstance(display_name, str) and display_name.strip() else None


def _read_location_name(latitude: float, longitude: float) -> dict[str, Any]:
    global _LAST_REQUEST_AT

    query = urlencode({
        "format": "jsonv2",
        "lat": f"{latitude:.5f}",
        "lon": f"{longitude:.5f}",
        "zoom": "10",
        "addressdetails": "1",
    })
    request = Request(
        f"{NOMINATIM_URL}?{query}",
        headers={
            "Accept": "application/json",
            "User-Agent": "Ulavurai/1.0 (location label lookup)",
        },
    )

    try:
        with _REQUEST_LOCK:
            wait_seconds = _MIN_REQUEST_INTERVAL_SECONDS - (
                time.monotonic() - _LAST_REQUEST_AT
            )
            if wait_seconds > 0:
                time.sleep(wait_seconds)
            _LAST_REQUEST_AT = time.monotonic()
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read())
    except HTTPError as exc:
        logger.warning("Reverse geocoder returned HTTP %s.", exc.code)
        raise LocationNameError("The location-name service is temporarily unavailable.") from exc
    except (
        URLError,
        TimeoutError,
        OSError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as exc:
        logger.warning("Reverse geocoder request failed: %s", type(exc).__name__)
        raise LocationNameError("The location name could not be retrieved.") from exc

    if not isinstance(payload, dict):
        raise LocationNameError("The location-name service returned an invalid response.")

    label = _label_from_address(payload)
    if not label:
        raise LocationNameError("No place name was found for this map point.")

    return {
        "status": "available",
        "name": label[:240],
        "source": "OpenStreetMap Nominatim",
        "source_url": "https://nominatim.openstreetmap.org/",
        "attribution_url": "https://www.openstreetmap.org/copyright",
        "attribution": "© OpenStreetMap contributors",
    }


def lookup_location_name(latitude: float, longitude: float) -> dict[str, Any]:
    validate_coordinates(latitude, longitude)
    key = (round(latitude, 5), round(longitude, 5))
    now = time.monotonic()

    with _CACHE_LOCK:
        cached = _CACHE.get(key)
        if cached and now - cached[0] < _CACHE_TTL_SECONDS:
            _CACHE.move_to_end(key)
            return cached[1]
        if cached:
            del _CACHE[key]

    try:
        result = _read_location_name(*key)
    except LocationNameError as exc:
        return {
            "status": "unavailable",
            "name": None,
            "source": "OpenStreetMap Nominatim",
            "source_url": "https://nominatim.openstreetmap.org/",
            "attribution_url": "https://www.openstreetmap.org/copyright",
            "attribution": "© OpenStreetMap contributors",
            "warning": str(exc),
        }

    with _CACHE_LOCK:
        _CACHE[key] = (time.monotonic(), result)
        _CACHE.move_to_end(key)
        while len(_CACHE) > _CACHE_MAX_ITEMS:
            _CACHE.popitem(last=False)
    return result


def clear_location_name_cache() -> None:
    global _LAST_REQUEST_AT
    with _CACHE_LOCK:
        _CACHE.clear()
    with _REQUEST_LOCK:
        _LAST_REQUEST_AT = 0.0
