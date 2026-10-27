from __future__ import annotations

import csv
import json
import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    import rasterio
    from rasterio.transform import rowcol
    from rasterio.warp import transform

    RASTERIO_AVAILABLE = True
    RASTERIO_IMPORT_ERROR = None
except (ImportError, OSError) as exc:
    rasterio = None
    rowcol = None
    transform = None

    RASTERIO_AVAILABLE = False
    RASTERIO_IMPORT_ERROR = str(exc)

logger = logging.getLogger(__name__)

SOIL_DIRECTORY = Path(__file__).resolve().parents[1] / "data" / "soil"
SOIL_CSV_PATH = SOIL_DIRECTORY / "soil_samples.csv"
SOIL_METADATA_PATH = SOIL_DIRECTORY / "metadata.json"
SOILGRIDS_METADATA_PATH = SOIL_DIRECTORY / "soilgrids_metadata.json"
SOILGRIDS_PH_PATH = SOIL_DIRECTORY / "soilgrids_ph_0-5cm_mean_tamil-nadu-extent.tif"
SOILGRIDS_NITROGEN_PATH = SOIL_DIRECTORY / "soilgrids_nitrogen_0-5cm_mean_tamil-nadu-extent.tif"
SOIL_PROPERTIES = ("N", "P", "K", "ph")
MODEL_PROPERTIES = (*SOIL_PROPERTIES, "temperature", "humidity", "rainfall")
EARTH_RADIUS_M = 6_371_000
NUTRIENT_COMPATIBILITY = {
    "N": {
        "model_definition": "ratio of Nitrogen content in soil",
        "model_units": None,
        "training_source_doi": "10.6084/m9.figshare.26308696.v2",
        "source_eligibility": False,
        "missing_requirements": [
            "The meaning of the training-data ratio and its physical units.",
            "Whether the model feature is total or plant-available nitrogen and, if available, the extraction method.",
            "A documented unit conversion linking source measurements to the model feature.",
            "Georeferenced records with sampling date, depth, method, and reuse permission.",
        ],
    },
    "P": {
        "model_definition": "ratio of Phosphorous content in soil",
        "model_units": None,
        "training_source_doi": "10.6084/m9.figshare.26308696.v2",
        "source_eligibility": False,
        "missing_requirements": [
            "The meaning of the training-data ratio and its physical units.",
            "The phosphorus chemical form and laboratory extraction method represented by the model feature.",
            "A documented unit conversion linking source measurements to the model feature.",
            "Georeferenced records with sampling date, depth, method, and reuse permission.",
        ],
    },
    "K": {
        "model_definition": "ratio of Potassium content in soil",
        "model_units": None,
        "training_source_doi": "10.6084/m9.figshare.26308696.v2",
        "source_eligibility": False,
        "missing_requirements": [
            "The meaning of the training-data ratio and its physical units.",
            "The potassium fraction and laboratory extraction method represented by the model feature.",
            "A documented unit conversion linking source measurements to the model feature.",
            "Georeferenced records with sampling date, depth, method, and reuse permission.",
        ],
    },
}
for _nutrient_definition in NUTRIENT_COMPATIBILITY.values():
    _nutrient_definition["reason"] = (
        "The training source describes this feature only as a nutrient-content "
        "ratio; the model-compatible definition and measurement units remain "
        "unverified."
    )


class SoilDatasetError(RuntimeError):
    """Raised when an installed local soil dataset is invalid or unreadable."""


def validate_coordinates(latitude: float, longitude: float) -> None:
    if (
        isinstance(latitude, bool)
        or isinstance(longitude, bool)
        or not isinstance(latitude, (int, float))
        or not isinstance(longitude, (int, float))
        or not math.isfinite(latitude)
        or not math.isfinite(longitude)
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        raise ValueError("Latitude or longitude is outside its valid range.")


def _distance_m(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    lat_a, lat_b = math.radians(latitude_a), math.radians(latitude_b)
    delta_lat = lat_b - lat_a
    delta_lon = math.radians(longitude_b - longitude_a)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(haversine)))


def _cache_key(csv_path: str, metadata_path: str) -> tuple[str, str, int, int, int, int]:
    data_path, info_path = Path(csv_path), Path(metadata_path)
    try:
        data_stat, info_stat = data_path.stat(), info_path.stat()
    except OSError as exc:
        raise SoilDatasetError("The configured soil dataset could not be read.") from exc
    return (
        str(data_path),
        str(info_path),
        data_stat.st_mtime_ns,
        data_stat.st_size,
        info_stat.st_mtime_ns,
        info_stat.st_size,
    )


@lru_cache(maxsize=4)
def _load_cached(
    csv_path: str,
    metadata_path: str,
    _csv_mtime_ns: int,
    _csv_size: int,
    _metadata_mtime_ns: int,
    _metadata_size: int,
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    try:
        metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
        if not isinstance(metadata, dict):
            raise ValueError("Metadata must be a JSON object.")
        with Path(csv_path).open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if reader.fieldnames is None or not {"latitude", "longitude"}.issubset(reader.fieldnames):
                raise ValueError("CSV must include latitude and longitude columns.")
            fieldnames = reader.fieldnames
            rows = list(reader)
    except (OSError, UnicodeError, csv.Error, json.JSONDecodeError, ValueError) as exc:
        logger.error("Local soil dataset could not be loaded: %s", exc)
        raise SoilDatasetError("The configured soil dataset is invalid or unreadable.") from exc

    if not rows:
        raise SoilDatasetError("The configured soil dataset contains no samples.")
    _validate_metadata(metadata)
    if any(
        definition["column"] not in fieldnames
        for definition in metadata["properties"].values()
    ):
        raise SoilDatasetError("Soil metadata refers to a missing CSV property column.")
    return metadata, rows


@lru_cache(maxsize=4)
def _load_raster_cached(
    raster_path: str,
    _mtime_ns: int,
    _size: int,
) -> tuple[Any, Any, Any, int, int]:
    try:
        with rasterio.open(raster_path) as dataset:
            band = dataset.read(1, masked=True)
            if dataset.crs is None:
                raise ValueError("The raster must define a coordinate reference system.")
            return band, dataset.transform, dataset.crs, dataset.width, dataset.height
    except (OSError, rasterio.errors.RasterioError, ValueError) as exc:
        logger.error("Local soil raster could not be loaded: %s", exc)
        raise SoilDatasetError("The configured soil raster is invalid or unreadable.") from exc


def _load_raster(raster_path: Path) -> tuple[Any, Any, Any, int, int]:
    try:
        stat = raster_path.stat()
    except OSError as exc:
        raise SoilDatasetError("The configured soil raster could not be read.") from exc
    return _load_raster_cached(str(raster_path), stat.st_mtime_ns, stat.st_size)


@lru_cache(maxsize=4)
def _load_raster_metadata(
    metadata_path: str,
    _mtime_ns: int,
    _size: int,
) -> dict[str, Any]:
    try:
        metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        logger.error("Local soil raster metadata could not be loaded: %s", exc)
        raise SoilDatasetError(
            "The configured soil raster metadata is invalid or unreadable."
        ) from exc
    required = ("dataset_name", "source", "citation", "license")
    if (
        not isinstance(metadata, dict)
        or any(
            not isinstance(metadata.get(key), str) or not metadata[key].strip()
            for key in required
        )
        or not isinstance(metadata.get("properties"), dict)
    ):
        raise SoilDatasetError("Soil raster metadata is incomplete.")
    resolution = metadata.get("spatial_resolution_m")
    if (
        isinstance(resolution, bool)
        or not isinstance(resolution, (int, float))
        or not math.isfinite(resolution)
        or resolution <= 0
    ):
        raise SoilDatasetError(
            "Soil raster metadata must define a positive spatial resolution."
        )
    if not isinstance(metadata.get("coverage"), str) or not metadata["coverage"].strip():
        raise SoilDatasetError("Soil raster metadata must describe its coverage.")
    properties = metadata["properties"]
    if not {"ph", "total_nitrogen"}.issubset(properties):
        raise SoilDatasetError(
            "Soil raster metadata must define pH and total nitrogen bands."
        )
    for name, definition in properties.items():
        depth = definition.get("soil_depth_cm") if isinstance(definition, dict) else None
        scale_factor = definition.get("scale_factor", 1) if isinstance(definition, dict) else None
        if (
            name not in ("ph", "total_nitrogen")
            or not isinstance(definition, dict)
            or not isinstance(definition.get("file"), str)
            or not definition["file"].strip()
            or not isinstance(definition.get("units"), str)
            or not definition["units"].strip()
            or not isinstance(depth, list)
            or len(depth) != 2
            or any(
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
                for value in depth
            )
            or depth[0] < 0
            or depth[1] <= depth[0]
            or isinstance(scale_factor, bool)
            or not isinstance(scale_factor, (int, float))
            or not math.isfinite(scale_factor)
            or scale_factor <= 0
            or not isinstance(definition.get("limitations", []), list)
            or any(
                not isinstance(item, str)
                for item in definition.get("limitations", [])
            )
        ):
            raise SoilDatasetError(
                "Soil raster metadata contains an unsupported property."
            )
    return metadata


def _load_raster_metadata_file(metadata_path: Path) -> dict[str, Any]:
    try:
        stat = metadata_path.stat()
    except OSError as exc:
        raise SoilDatasetError(
            "The configured soil raster metadata could not be read."
        ) from exc
    return _load_raster_metadata(
        str(metadata_path), stat.st_mtime_ns, stat.st_size
    )


def _validate_metadata(metadata: dict[str, Any]) -> None:
    required_text = ("dataset_name", "source", "citation", "license")
    if any(not isinstance(metadata.get(key), str) or not metadata[key].strip() for key in required_text):
        raise SoilDatasetError(
            "Soil metadata must document dataset_name, source, citation, and license."
        )
    for key in ("spatial_resolution_m", "max_lookup_distance_m"):
        value = metadata.get(key)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value <= 0
        ):
            raise SoilDatasetError(f"Soil metadata must provide a positive {key}.")
    properties = metadata.get("properties")
    if not isinstance(properties, dict):
        raise SoilDatasetError("Soil metadata must define its properties.")
    missing_values = metadata.get("missing_values", ["", "NA", "NaN", "NoData", "-9999"])
    if not isinstance(missing_values, list) or any(
        not isinstance(value, str) for value in missing_values
    ):
        raise SoilDatasetError("Soil metadata missing_values must be a list of strings.")
    for name, definition in properties.items():
        if name not in SOIL_PROPERTIES or not isinstance(definition, dict):
            raise SoilDatasetError("Soil metadata contains an unsupported property.")
        if not isinstance(definition.get("column"), str) or not definition["column"].strip():
            raise SoilDatasetError(f"Soil metadata must define the CSV column for {name}.")
        if not isinstance(definition.get("units"), str) or not definition["units"].strip():
            raise SoilDatasetError(f"Soil metadata must define units for {name}.")
        if definition.get("value_type") not in ("direct_measurement", "mapped_estimate"):
            raise SoilDatasetError(f"Soil metadata must identify the value type for {name}.")
        depth = definition.get("soil_depth_cm")
        if (
            isinstance(depth, bool)
            or not isinstance(depth, (int, float))
            or not math.isfinite(depth)
            or depth <= 0
        ):
            raise SoilDatasetError(f"Soil metadata must define a positive soil depth for {name}.")


def _number(value: object) -> float | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def _empty_result(latitude: float, longitude: float, status: str, warning: str) -> dict[str, Any]:
    return {
        "latitude": latitude,
        "longitude": longitude,
        "dataset_status": status,
        "properties": {},
        "context_properties": {},
        "inputs": {},
        "available_properties": [],
        "unavailable_properties": list(MODEL_PROPERTIES),
        "nutrient_availability": _nutrient_availability(),
        "provenance": None,
        "lookup": None,
        "warnings": [
            warning,
            "Temperature, humidity, and rainfall are not supplied by the soil dataset.",
        ],
    }


def _nutrient_availability(
    sample_metadata: dict[str, Any] | None = None,
    sample_coverage: bool = False,
    sample_values: set[str] | None = None,
    raster_metadata: dict[str, Any] | None = None,
    raster_coverage: bool = False,
    raster_context_properties: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    sample_properties = (
        sample_metadata.get("properties", {}) if sample_metadata else {}
    )
    sample_values = sample_values or set()
    raster_context_properties = raster_context_properties or {}
    result = {}

    for name in ("N", "P", "K"):
        candidate = sample_properties.get(name)
        raster_nitrogen = name == "N" and raster_metadata is not None
        if candidate:
            source = sample_metadata["dataset_name"]
            units = candidate["units"]
            depth = candidate["soil_depth_cm"]
            resolution = sample_metadata["spatial_resolution_m"]
            value_type = candidate["value_type"]
            has_value = name in sample_values
            covered = sample_coverage
        elif raster_nitrogen:
            definition = raster_metadata["properties"]["total_nitrogen"]
            source = raster_metadata["dataset_name"]
            units = definition["units"]
            depth = definition["soil_depth_cm"]
            resolution = raster_metadata["spatial_resolution_m"]
            value_type = "mapped_estimate"
            has_value = "total_nitrogen" in raster_context_properties
            covered = raster_coverage
        else:
            source = None
            units = None
            depth = None
            resolution = None
            value_type = None
            has_value = False
            covered = False

        if candidate or raster_nitrogen:
            status = (
                "incompatible"
                if has_value
                else "no_data"
                if covered
                else "outside_coverage"
            )
            reason = (
                f"A local {name} value exists, but it is not verified against "
                f"the model feature. {NUTRIENT_COMPATIBILITY[name]['reason']}"
                if has_value
                else "The selected location has no valid value in this local "
                "nutrient dataset."
                if covered
                else "The selected location is outside this local nutrient "
                "dataset's coverage."
            )
            if raster_nitrogen and not candidate:
                reason = (
                    "SoilGrids supplies total nitrogen, but the training CSV "
                    "defines N only as a nutrient-content ratio without units "
                    "or nutrient form; total nitrogen is not used as model N."
                    if has_value
                    else reason
                )
        else:
            status = "not_installed"
            reason = NUTRIENT_COMPATIBILITY[name]["reason"]

        result[name] = {
            "status": status,
            "available": False,
            "value": None,
            "units": units,
            "source": source,
            "spatial_resolution_m": resolution,
            "soil_depth_cm": depth,
            "value_type": value_type,
            "reason": reason,
            "missing_requirements": NUTRIENT_COMPATIBILITY[name][
                "missing_requirements"
            ],
        }
    return result


def lookup_local_soil(
    latitude: float,
    longitude: float,
    *,
    csv_path: Path | None = None,
    metadata_path: Path | None = None,
    ph_raster_path: Path | None = None,
    nitrogen_raster_path: Path | None = None,
    raster_metadata_path: Path | None = None,
) -> dict[str, Any]:
    validate_coordinates(latitude, longitude)
    use_default_datasets = all(
        path is None
        for path in (
            csv_path,
            metadata_path,
            ph_raster_path,
            nitrogen_raster_path,
            raster_metadata_path,
        )
    )
    data_path = csv_path or SOIL_CSV_PATH
    info_path = metadata_path or SOIL_METADATA_PATH
    raster_info_path = raster_metadata_path or (
        SOILGRIDS_METADATA_PATH if use_default_datasets else None
    )
    raster_paths = {
        "ph": ph_raster_path or (SOILGRIDS_PH_PATH if use_default_datasets else None),
        "total_nitrogen": nitrogen_raster_path
        or (SOILGRIDS_NITROGEN_PATH if use_default_datasets else None),
    }
    csv_installed = data_path.is_file() or info_path.is_file()
    raster_installed = (
        raster_info_path is not None and raster_info_path.is_file()
    ) or any(path is not None and path.exists() for path in raster_paths.values())
    if not csv_installed and not raster_installed:
        return _empty_result(
            latitude,
            longitude,
            "not_installed",
            "No local soil dataset is installed; soil fields must be entered manually.",
        )
    properties: dict[str, dict[str, Any]] = {}
    context_properties: dict[str, dict[str, Any]] = {}
    inputs: dict[str, float] = {}
    provenance = None
    lookup = None
    csv_coverage = False
    raster_coverage = False
    warnings = ["Temperature, humidity, and rainfall are not supplied by the soil dataset."]
    sample_metadata = None
    sample_values: set[str] = set()
    raster_metadata = None

    if csv_installed:
        if not data_path.is_file() or not info_path.is_file():
            raise SoilDatasetError("Both soil_samples.csv and metadata.json are required.")
        key = _cache_key(str(data_path), str(info_path))
        metadata, rows = _load_cached(*key)
        sample_metadata = metadata
        closest: tuple[float, dict[str, str]] | None = None
        try:
            for row in rows:
                sample_latitude = _number(row.get("latitude"))
                sample_longitude = _number(row.get("longitude"))
                if (
                    sample_latitude is None
                    or sample_longitude is None
                    or not -90 <= sample_latitude <= 90
                    or not -180 <= sample_longitude <= 180
                ):
                    raise ValueError("Dataset contains invalid sample coordinates.")
                distance = _distance_m(latitude, longitude, sample_latitude, sample_longitude)
                if closest is None or distance < closest[0]:
                    closest = (distance, row)
        except (AttributeError, ValueError) as exc:
            raise SoilDatasetError("The configured soil dataset contains invalid rows.") from exc

        if closest is not None and closest[0] <= metadata["max_lookup_distance_m"]:
            csv_coverage = True
            distance, row = closest
            for name, definition in metadata["properties"].items():
                raw_value = row.get(definition["column"])
                missing_values = metadata.get(
                    "missing_values", ["", "NA", "NaN", "NoData", "-9999"]
                )
                if raw_value is None or raw_value.strip() in missing_values:
                    continue
                value = _number(raw_value)
                if value is None or (
                    name == "ph" and not 0 <= value <= 14
                ) or (
                    name != "ph" and value < 0
                ):
                    continue
                if name in ("N", "P", "K"):
                    sample_values.add(name)
                    continue
                properties[name] = {
                    "value": value,
                    "units": definition["units"],
                    "value_type": definition["value_type"],
                    "source": metadata["dataset_name"],
                    "soil_depth_cm": definition["soil_depth_cm"],
                    "spatial_resolution_m": metadata["spatial_resolution_m"],
                }
                inputs[name] = value
            provenance = {
                "dataset_name": metadata["dataset_name"],
                "source": metadata["source"],
                "citation": metadata["citation"],
                "license": metadata["license"],
                "spatial_resolution_m": metadata["spatial_resolution_m"],
                "max_lookup_distance_m": metadata["max_lookup_distance_m"],
            }
            lookup = {
                "method": "nearest_point_sample",
                "sample_latitude": float(row["latitude"]),
                "sample_longitude": float(row["longitude"]),
                "distance_m": round(distance, 2),
            }
    if raster_installed and not RASTERIO_AVAILABLE:
        logger.warning(
            "Raster soil lookup is unavailable: %s",
            RASTERIO_IMPORT_ERROR,
        )
        warnings.append(
            "Raster-based soil lookup is temporarily unavailable in this "
            "deployment. CSV-based soil lookup remains available."
        )
        raster_installed = False

    if raster_installed:
        if raster_info_path is None or not raster_info_path.is_file():
            raise SoilDatasetError("Soil raster metadata is missing.")
        raster_metadata = _load_raster_metadata_file(raster_info_path)
        if not use_default_datasets:
            raster_paths = {
                name: path or raster_info_path.parent / definition["file"]
                for name, path in raster_paths.items()
                for definition in [raster_metadata["properties"][name]]
            }
        for name, path in raster_paths.items():
            if path is None:
                continue
            if not path.is_file():
                raise SoilDatasetError(f"The configured SoilGrids raster for {name} is missing.")
            definition = raster_metadata["properties"][name]
            band, affine, crs, width, height = _load_raster(path)
            try:
                x, y = transform("EPSG:4326", crs, [longitude], [latitude])
                row_index, column_index = rowcol(affine, x[0], y[0])
            except (ValueError, rasterio.errors.RasterioError) as exc:
                raise SoilDatasetError("The SoilGrids raster coordinate transform failed.") from exc
            if not 0 <= row_index < height or not 0 <= column_index < width:
                continue
            raster_coverage = True
            cell = band[row_index, column_index]
            if bool(getattr(cell, "mask", False)):
                continue
            raw_value = float(cell)
            # The WCS export has no declared NoData tag; zero is its fill value.
            if not math.isfinite(raw_value) or raw_value == 0:
                continue
            value = raw_value * float(definition.get("scale_factor", 1))
            property_data = {
                "value": value,
                "units": definition["units"],
                "value_type": "mapped_estimate",
                "source": raster_metadata["dataset_name"],
                "soil_depth_cm": definition["soil_depth_cm"],
                "spatial_resolution_m": raster_metadata["spatial_resolution_m"],
                "limitations": definition.get("limitations", []),
            }
            if name == "ph":
                if not 0 <= value <= 14 or name in properties:
                    continue
                properties[name] = property_data
                inputs[name] = value
            else:
                context_properties[name] = property_data
            if provenance is None:
                provenance = {
                    "dataset_name": raster_metadata["dataset_name"],
                    "dataset_version": raster_metadata.get("dataset_version"),
                    "source": raster_metadata["source"],
                    "citation": raster_metadata["citation"],
                    "license": raster_metadata["license"],
                    "spatial_resolution_m": raster_metadata["spatial_resolution_m"],
                    "coverage": raster_metadata["coverage"],
                }
                lookup = {
                    "method": "raster_cell",
                    "native_resolution_m": raster_metadata["spatial_resolution_m"],
                    "pixel_size_m": {
                        "x": round(abs(affine.a), 2),
                        "y": round(abs(affine.e), 2),
                    },
                }

    unavailable = [name for name in MODEL_PROPERTIES if name not in properties]
    if properties and not unavailable:
        status = "available"
    elif properties or context_properties:
        status = "partial"
    elif csv_coverage or raster_coverage:
        status = "no_data"
    elif csv_installed or raster_installed:
        status = "outside_coverage"
    else:
        status = "not_installed"
    if raster_installed:
        warnings.append(
            "SoilGrids values are mapped estimates at approximately 250 m resolution, not field measurements; zero-filled cells are unavailable. No uncertainty raster is installed, so a cell-specific confidence interval is unavailable."
        )
    if raster_installed and raster_coverage and not properties and not context_properties:
        warnings.append("The selected raster cell contains no valid SoilGrids value.")
    if raster_installed and status == "outside_coverage":
        warnings.append(
            "The selected coordinates are outside the installed raster extent or the configured point-sample distance."
        )
    return {
        "latitude": latitude,
        "longitude": longitude,
        "dataset_status": status,
        "properties": properties,
        "context_properties": context_properties,
        "inputs": inputs,
        "available_properties": list(properties),
        "unavailable_properties": unavailable,
        "nutrient_availability": _nutrient_availability(
            sample_metadata=sample_metadata,
            sample_coverage=csv_coverage,
            sample_values=sample_values,
            raster_metadata=raster_metadata,
            raster_coverage=raster_coverage,
            raster_context_properties=context_properties,
        ),
        "provenance": provenance,
        "lookup": lookup,
        "warnings": warnings,
    }
