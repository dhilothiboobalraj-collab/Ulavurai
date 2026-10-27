"""Report coverage from the installed local soil and climate datasets."""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from rasterio.warp import transform_bounds

from backend.services.local_soil_lookup import (
    NUTRIENT_COMPATIBILITY,
    SOIL_CSV_PATH,
    SOILGRIDS_METADATA_PATH,
)
from backend.services.local_climate_lookup import CLIMATE_DATASET_PATH

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CLIMATE_FIELDS = {
    "temperature_c": "°C",
    "relative_humidity_pct": "%",
    "precipitation_mm_month": "mm/month",
}
MONTHS = tuple(f"{month:02d}" for month in range(1, 13))


def _climate_coverage(path: Path = CLIMATE_DATASET_PATH) -> dict[str, Any]:
    if not path.is_file():
        return {
            "installed": False,
            "status": "not_installed",
            "grid_cells": 0,
            "valid_grid_cells": 0,
            "missing_grid_cells": 0,
            "grid_center_bounds_wgs84": None,
            "grid_resolution_degrees": None,
            "parameters": {},
            "no_coverage": "No local climate grid is installed.",
        }

    try:
        dataset = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Installed climate dataset is unreadable: {path}") from exc
    if not isinstance(dataset, dict) or not isinstance(dataset.get("cells"), list):
        raise ValueError(f"Installed climate dataset has no valid cell list: {path}")

    cells = dataset["cells"]
    if not cells:
        raise ValueError(f"Installed climate dataset contains no grid cells: {path}")
    if dataset.get("monthly_values_are_context_only") is not True:
        raise ValueError(f"Installed climate dataset has unsupported value semantics: {path}")

    per_parameter = {
        name: {"valid_month_values": 0, "cells_with_any_valid_month": 0, "cells_with_all_months": 0}
        for name in CLIMATE_FIELDS
    }
    valid_grid_cells = 0
    latitudes = []
    longitudes = []
    for cell in cells:
        if (
            not isinstance(cell, dict)
            or isinstance(cell.get("latitude"), bool)
            or not isinstance(cell.get("latitude"), (int, float))
            or not math.isfinite(cell["latitude"])
            or isinstance(cell.get("longitude"), bool)
            or not isinstance(cell.get("longitude"), (int, float))
            or not math.isfinite(cell["longitude"])
            or not isinstance(cell.get("months"), dict)
            or set(cell["months"]) != set(MONTHS)
        ):
            raise ValueError(f"Installed climate dataset contains an invalid grid cell: {path}")
        latitudes.append(cell["latitude"])
        longitudes.append(cell["longitude"])
        cell_has_data = False
        for name in CLIMATE_FIELDS:
            values = []
            for month in MONTHS:
                monthly_values = cell["months"][month]
                value = monthly_values.get(name) if isinstance(monthly_values, dict) else None
                if value is not None and (
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not math.isfinite(value)
                ):
                    raise ValueError(
                        f"Installed climate dataset contains an invalid {name} value: {path}"
                    )
                values.append(value)
            valid_months = sum(value is not None for value in values)
            stats = per_parameter[name]
            stats["valid_month_values"] += valid_months
            stats["cells_with_any_valid_month"] += valid_months > 0
            stats["cells_with_all_months"] += valid_months == len(MONTHS)
            cell_has_data = cell_has_data or valid_months > 0
        valid_grid_cells += cell_has_data

    grid_cells = len(cells)
    parameters = {}
    definitions = dataset.get("parameters")
    definitions_by_output = {}
    if isinstance(definitions, dict):
        definitions_by_output = {
            definition.get("output"): definition
            for definition in definitions.values()
            if isinstance(definition, dict)
        }
    for name, stats in per_parameter.items():
        definition = definitions_by_output.get(name)
        if not isinstance(definition, dict) or definition.get("units") != CLIMATE_FIELDS[name]:
            raise ValueError(f"Installed climate dataset has invalid units for {name}: {path}")
        parameters[name] = {
            "units": CLIMATE_FIELDS[name],
            **stats,
            "coverage_percent_of_installed_grid": round(
                100 * stats["cells_with_any_valid_month"] / grid_cells,
                4,
            ),
            "possible_month_values": grid_cells * len(MONTHS),
            "valid_percent_of_month_values": round(
                100 * stats["valid_month_values"] / (grid_cells * len(MONTHS)),
                4,
            ),
            "missing_cells_without_any_valid_month": (
                grid_cells - stats["cells_with_any_valid_month"]
            ),
            "complete_12_month_cells": stats["cells_with_all_months"],
        }

    period = dataset.get("reference_period")
    resolution = dataset.get("grid_resolution_degrees")
    maximum_distance = dataset.get("maximum_match_distance_m")
    if (
        not isinstance(period, dict)
        or not isinstance(resolution, dict)
        or isinstance(maximum_distance, bool)
        or not isinstance(maximum_distance, (int, float))
        or not math.isfinite(maximum_distance)
        or maximum_distance <= 0
    ):
        raise ValueError(f"Installed climate dataset has incomplete coverage metadata: {path}")

    return {
        "installed": True,
        "status": (
            "available"
            if valid_grid_cells == grid_cells
            else "partial" if valid_grid_cells else "no_data"
        ),
        "dataset_name": dataset.get("dataset_name"),
        "source": dataset.get("source"),
        "license": dataset.get("license"),
        "context_only": dataset.get("monthly_values_are_context_only") is True,
        "reference_period": period,
        "grid_cells": grid_cells,
        "valid_grid_cells": valid_grid_cells,
        "missing_grid_cells": grid_cells - valid_grid_cells,
        "valid_percent_of_installed_grid": round(100 * valid_grid_cells / grid_cells, 4),
        "grid_center_bounds_wgs84": [
            round(min(longitudes), 6),
            round(min(latitudes), 6),
            round(max(longitudes), 6),
            round(max(latitudes), 6),
        ],
        "grid_resolution_degrees": resolution,
        "maximum_match_distance_m": maximum_distance,
        "parameters": parameters,
        "no_coverage": (
            "A point has no climate lookup when it is farther than the configured "
            "maximum match distance from every installed grid cell. This describes "
            "point lookup limits, not the percentage of farms or land covered."
        ),
    }


def build_report() -> dict[str, Any]:
    metadata = json.loads(SOILGRIDS_METADATA_PATH.read_text(encoding="utf-8"))
    rasters = []
    grid_cells = 0
    coverage_bounds = None
    data_sources = [
        {
            "name": "ICFA Crop Recommendation dataset v2 (training data)",
            "url": "https://figshare.com/articles/dataset/Crop_Recommendation_dataset/26308696",
            "license": "CC BY 4.0",
            "download_status": (
                "The local CSV matches the published file MD5; this dataset "
                "is training data, not a geospatial soil source."
            ),
            "coverage_status": (
                "2,200 rows without coordinates. N/P/K are described as "
                "nutrient-content ratios; units and chemical forms are "
                "undocumented."
            ),
        },
        {
            "name": "ISRIC SoilGrids 2.0",
            "url": "https://docs.isric.org/globaldata/soilgrids/",
            "license": metadata["license"],
            "download_status": "installed",
            "coverage_status": (
                "Local 0-5 cm pH and total-nitrogen raster extracts; neither "
                "is an eligible model N/P/K source."
            ),
        },
        {
            "name": "Government of India Soil Health Card portal",
            "url": "https://soilhealth.dac.gov.in/",
            "license": "Underlying-data license not verified",
            "download_status": "No authorized bulk point-data download verified",
            "coverage_status": (
                "Public landing page does not document downloadable point "
                "records, coordinates, units, depths, dates, methods, or "
                "missing-value representation."
            ),
        },
        {
            "name": "Tamil Nadu Agricultural Department / Tamil Mannvalam",
            "url": "https://www.tnagrisnet.tn.gov.in/",
            "license": "Underlying dataset license not verified",
            "download_status": (
                "The public AGRISNET landing page was reachable, but no "
                "downloadable georeferenced soil file or data license was verified."
            ),
            "coverage_status": (
                "No public file with sample coordinates, N/P/K analyte definitions, "
                "laboratory methods, units, depths, dates, and reuse terms was verified."
            ),
        },
        {
            "name": "NRSC/Bhuvan soils and nutrient-status mapping",
            "url": "https://www.nrsc.gov.in/nrscnew/Apps_Soils_Apps.php",
            "license": (
                "Bhuvan terms restrict copying, redistribution, and bulk "
                "downloads without prior written authorization"
            ),
            "download_status": "No permitted georeferenced point-data file verified",
            "coverage_status": (
                "Reviewed sources describe district-level nutrient maps and "
                "geo-registered workflows, not a published point dataset with "
                "model-compatible methods and units."
            ),
        },
        {
            "name": "FAO Global Soil Nutrient Map (GSNmap)",
            "url": (
                "https://www.fao.org/global-soil-partnership/soil-data/"
                "global-soil-nutrient-map-gsnmap/en/"
            ),
            "license": (
                "Underlying map-data license not verified; the technical "
                "manual is CC BY-NC-SA 3.0 IGO"
            ),
            "download_status": "No compatible India data download verified",
            "coverage_status": (
                "Reviewed project documentation does not identify a point "
                "archive of Indian lab tests, compatible analyte forms, "
                "resolution, depth, dates, or units."
            ),
        },
    ]
    climate_coverage = _climate_coverage()
    data_sources.append({
        "name": climate_coverage.get(
            "dataset_name", "NASA POWER historical monthly climate normals"
        ),
        "url": "https://power.larc.nasa.gov/",
        "license": climate_coverage.get(
            "license",
            "NASA Earth science data full-and-open data policy; attribution required.",
        ),
        "download_status": (
            "installed" if climate_coverage["installed"] else "not installed"
        ),
        "coverage_status": (
            f'{climate_coverage["grid_cells"]} installed grid cells; '
            f'{climate_coverage["valid_grid_cells"]} contain climate values.'
            if climate_coverage["installed"]
            else climate_coverage["no_coverage"]
        ),
    })

    for property_name, definition in metadata["properties"].items():
        raster_path = SOILGRIDS_METADATA_PATH.parent / definition["file"]
        if not raster_path.is_file():
            raise FileNotFoundError(f"Installed soil raster is missing: {raster_path}")
        with rasterio.open(raster_path) as dataset:
            if dataset.crs is None:
                raise ValueError(f"Soil raster has no CRS: {raster_path}")
            band = dataset.read(1, masked=True)
            valid = ~np.ma.getmaskarray(band) & np.isfinite(band.data) & (band.data != 0)
            valid_cells = int(np.count_nonzero(valid))
            grid_cells = max(grid_cells, dataset.width * dataset.height)
            bounds = transform_bounds(
                dataset.crs,
                "EPSG:4326",
                *dataset.bounds,
                densify_pts=21,
            )
            if coverage_bounds is None:
                coverage_bounds = bounds
            rasters.append({
                "property": property_name,
                "file": raster_path.name,
                "units": definition["units"],
                "depth_cm": definition["soil_depth_cm"],
                "resolution_m": metadata["spatial_resolution_m"],
                "crs": dataset.crs.to_string(),
                "width": dataset.width,
                "height": dataset.height,
                "grid_cells": dataset.width * dataset.height,
                "valid_nonzero_cells": valid_cells,
                "missing_cells": dataset.width * dataset.height - valid_cells,
                "valid_percent_of_grid": round(
                    100 * valid_cells / (dataset.width * dataset.height), 4
                ),
                "wgs84_bounds": [round(value, 6) for value in bounds],
            })

    has_sample_dataset = SOIL_CSV_PATH.is_file()
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "compatible_npk_source_installed": False,
        "data_sources": data_sources,
        "compatibility_configuration": NUTRIENT_COMPATIBILITY,
        "dataset_coverage": {
            "dataset": metadata["dataset_name"],
            "license": metadata["license"],
            "raster_grid_cells": grid_cells,
            "wgs84_bounds": (
                [round(value, 6) for value in coverage_bounds]
                if coverage_bounds is not None
                else None
            ),
            "point_sample_file_installed": has_sample_dataset,
            "no_coverage": (
                "Points outside the installed WGS84 bounds or in zero/NoData "
                "raster cells return unavailable. The report counts missing "
                "cells but does not calculate polygon boundaries for scattered gaps."
            ),
        },
        "climate_coverage": climate_coverage,
        "rasters": rasters,
        "model_input_coverage": {
            name: {
                "compatible_locations": 0,
                "coverage_percent_of_installed_grid": 0.0,
                "missing_compatible_cells": grid_cells,
                "missing_compatible_percent_of_installed_grid": 100.0,
                "exact_measurements": 0,
                "spatial_estimates": 0,
                "status": "unavailable",
                "reason": config["reason"],
            }
            for name, config in NUTRIENT_COMPATIBILITY.items()
        },
        "all_three_npk_coverage_percent_of_installed_grid": 0.0,
        "installed_grid_locations_without_usable_npk_percent": 100.0,
        "independent_test_locations": None,
        "accuracy_metrics": None,
        "limitations": [
            "The installed SoilGrids rasters provide pH and total nitrogen, not compatible model N/P/K measurements.",
            "The training CSV has no coordinates; its source describes N/P/K as nutrient-content ratios but does not document units or nutrient forms.",
            "No compatible georeferenced point-sample dataset is installed; no independent geographic accuracy evaluation can be performed.",
            "Coverage percentages use cells in the installed raster grid as the denominator, not all possible map locations.",
        ],
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional JSON report path; without it, print the report to stdout.",
    )
    args = parser.parse_args()
    report = build_report()
    serialized = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        output_path = args.output
        if not output_path.is_absolute():
            output_path = PROJECT_ROOT / output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote geospatial coverage report to {output_path}")
    else:
        print(serialized, end="")


if __name__ == "__main__":
    main()
