from __future__ import annotations

from typing import Any

if __package__.startswith("backend."):
    from backend.services.local_soil_lookup import (
        SoilDatasetError,
        lookup_local_soil,
    )
else:
    from services.local_soil_lookup import SoilDatasetError, lookup_local_soil


class LocationEstimateError(RuntimeError):
    """Raised when the local soil dataset cannot be read."""


def get_location_estimate(latitude: float, longitude: float) -> dict[str, Any]:
    try:
        result = lookup_local_soil(latitude, longitude)
    except SoilDatasetError as exc:
        raise LocationEstimateError("The local soil dataset is unavailable.") from exc

    return {
        "latitude": latitude,
        "longitude": longitude,
        "estimated_inputs": result["inputs"],
        "properties": result.get("properties", {}),
        "context_properties": result.get("context_properties", {}),
        "unavailable_properties": result.get("unavailable_properties", []),
        "dataset_status": result.get("dataset_status", "unavailable"),
        "provenance": result.get("provenance"),
        "lookup": result.get("lookup"),
        "annual_rainfall_mm": None,
        "sources": {
            "soil": result["provenance"]["dataset_name"]
            if result["provenance"]
            else "No local soil dataset installed",
            "climate": "Unavailable: no local climate dataset configured",
        },
        "warnings": result["warnings"],
    }
