"""Download the documented SoilGrids extracts used by the local lookup service."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import rasterio

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIRECTORY = PROJECT_ROOT / "backend" / "data" / "soil"
METADATA_NAME = "soilgrids_metadata.json"
WCS_ENDPOINT = "https://maps.isric.org/mapserv"
SUBSETTING_CRS = "http://www.opengis.net/def/crs/EPSG/0/4326"
OUTPUT_CRS = "http://www.opengis.net/def/crs/EPSG/0/152160"
WGS84_EXTENT = (76, 81, 8, 14)
EXPECTED_GRID = (2212, 2511)
EXPECTED_PIXEL_SIZE_M = (295.42, 266.0)
EXPECTED_PROJECTION = "igh"
REQUIRED_PROPERTIES = ("ph", "total_nitrogen")


def _coverage_url(map_name: str, coverage_id: str) -> str:
    west, east, south, north = WGS84_EXTENT
    parameters = [
        ("map", f"/map/{map_name}.map"),
        ("SERVICE", "WCS"),
        ("VERSION", "2.0.1"),
        ("REQUEST", "GetCoverage"),
        ("COVERAGEID", coverage_id),
        ("FORMAT", "image/tiff"),
        ("SUBSETTINGCRS", SUBSETTING_CRS),
        ("OUTPUTCRS", OUTPUT_CRS),
        ("SUBSET", f"Long({west},{east})"),
        ("SUBSET", f"Lat({south},{north})"),
    ]
    return f"{WCS_ENDPOINT}?{urlencode(parameters)}"


def _validate_metadata(metadata: Any) -> dict[str, Any]:
    if not isinstance(metadata, dict) or not isinstance(metadata.get("properties"), dict):
        raise ValueError(f"{METADATA_NAME} is missing its property definitions.")

    properties = metadata["properties"]
    for name in REQUIRED_PROPERTIES:
        definition = properties.get(name)
        if (
            not isinstance(definition, dict)
            or not isinstance(definition.get("file"), str)
            or not isinstance(definition.get("coverage_id"), str)
            or not isinstance(definition.get("wcs_map"), str)
        ):
            raise ValueError(f"{METADATA_NAME} is missing WCS metadata for {name}.")
    for name, definition in properties.items():
        if (
            not isinstance(name, str)
            or not isinstance(definition, dict)
            or not isinstance(definition.get("file"), str)
            or not isinstance(definition.get("coverage_id"), str)
            or not isinstance(definition.get("wcs_map"), str)
        ):
            raise ValueError(f"{METADATA_NAME} has invalid WCS metadata for {name}.")
    return properties


def _validate_raster(path: Path) -> None:
    try:
        with rasterio.open(path) as dataset:
            if dataset.count != 1 or (dataset.width, dataset.height) != EXPECTED_GRID:
                raise ValueError("The downloaded raster has an unexpected grid size.")
            if (
                dataset.crs is None
                or dataset.crs.to_dict().get("proj") != EXPECTED_PROJECTION
            ):
                raise ValueError("The downloaded raster has an unexpected output CRS.")
            pixel_size = (abs(dataset.transform.a), abs(dataset.transform.e))
            if any(
                abs(actual - expected) > 0.02
                for actual, expected in zip(pixel_size, EXPECTED_PIXEL_SIZE_M, strict=True)
            ):
                raise ValueError("The downloaded raster has an unexpected pixel size.")
            if dataset.read_masks(1).max() == 0:
                raise ValueError("The downloaded raster contains no valid pixels.")
    except (OSError, rasterio.errors.RasterioError) as exc:
        raise ValueError(f"Could not read downloaded GeoTIFF {path.name}.") from exc


def prepare_data(output_directory: Path = DEFAULT_DATA_DIRECTORY, timeout: int = 60) -> list[Path]:
    metadata_path = output_directory / METADATA_NAME
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(
            f"Keep the documented {METADATA_NAME} in {output_directory} before preparing data."
        ) from exc

    properties = _validate_metadata(metadata)
    output_directory.mkdir(parents=True, exist_ok=True)
    results: list[Path] = []
    with tempfile.TemporaryDirectory(prefix="soilgrids-", dir=output_directory) as temporary:
        staged: list[tuple[Path, Path]] = []
        for name in properties:
            definition = properties[name]
            destination = output_directory / definition["file"]
            staged_path = Path(temporary) / destination.name
            request = Request(
                _coverage_url(definition["wcs_map"], definition["coverage_id"]),
                headers={"User-Agent": "SeasonSenseAI geospatial data preparation"},
            )
            try:
                with urlopen(request, timeout=timeout) as response:
                    content_type = response.headers.get_content_type()
                    if response.status != 200 or content_type != "image/tiff":
                        raise ValueError(
                            f"SoilGrids returned HTTP {response.status} "
                            f"with content type {content_type} for {name}."
                        )
                    staged_path.write_bytes(response.read())
            except (HTTPError, URLError, TimeoutError, OSError) as exc:
                raise RuntimeError(f"Could not download the SoilGrids {name} raster.") from exc
            _validate_raster(staged_path)
            staged.append((staged_path, destination))

        for staged_path, destination in staged:
            os.replace(staged_path, destination)
            results.append(destination)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-directory",
        type=Path,
        default=DEFAULT_DATA_DIRECTORY,
        help="Directory containing soilgrids_metadata.json and receiving the GeoTIFFs.",
    )
    parser.add_argument("--timeout", type=int, default=60, help="Per-download timeout in seconds.")
    arguments = parser.parse_args()
    if arguments.timeout <= 0:
        parser.error("--timeout must be a positive number.")

    for path in prepare_data(arguments.output_directory, arguments.timeout):
        print(f"Prepared {path}")


if __name__ == "__main__":
    main()
