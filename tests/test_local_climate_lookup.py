import calendar
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api import geospatial
from backend.main import app
from backend.services import local_climate_lookup
from scripts import prepare_climate_data
from scripts.prepare_climate_data import build_climate_dataset


def fixture_dataset():
    months = {
        f"{month:02d}": {
            "temperature_c": 24.0 + month,
            "relative_humidity_pct": 60.0 + month,
            "precipitation_mm_month": float(month * 10),
            "temperature_c_valid_years": 30,
            "relative_humidity_pct_valid_years": 30,
            "precipitation_valid_years": 30,
        }
        for month in range(1, 13)
    }
    return {
        "dataset_name": "NASA POWER meteorological monthly normals",
        "source": "NASA POWER; GMAO MERRA-2",
        "source_url": "https://power.larc.nasa.gov/",
        "citation": "NASA POWER.",
        "license": "NASA full-and-open data policy.",
        "license_url": "https://www.earthdata.nasa.gov/",
        "reference_period": {"start_year": 1991, "end_year": 2020},
        "parameters": {
            "T2M": {
                "output": "temperature_c",
                "units": "°C",
                "definition": "Monthly mean 2 m air temperature.",
            },
            "RH2M": {
                "output": "relative_humidity_pct",
                "units": "%",
                "definition": "Monthly mean 2 m relative humidity.",
            },
            "PRECTOTCORR": {
                "output": "precipitation_mm_month",
                "units": "mm/month",
                "definition": "Monthly mean accumulation.",
            },
        },
        "monthly_values_are_context_only": True,
        "retrieved_at": "2026-10-27T00:00:00+00:00",
        "installed_at": "2026-10-27T00:00:00+00:00",
        "grid_resolution_degrees": {"latitude": 0.5, "longitude": 0.625},
        "maximum_match_distance_m": 50_000,
        "weather_training_period_compatibility": "Unknown.",
        "cells": [{
            "latitude": 9.0,
            "longitude": 78.125,
            "elevation_m": 36.06,
            "months": months,
        }],
    }


class LocalClimateLookupTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.dataset_path = Path(self.temporary_directory.name) / "climate.json"
        self.write_dataset(fixture_dataset())

    def tearDown(self):
        self.temporary_directory.cleanup()
        local_climate_lookup._load_cached.cache_clear()

    def write_dataset(self, dataset):
        self.dataset_path.write_text(json.dumps(dataset), encoding="utf-8")
        local_climate_lookup._load_cached.cache_clear()

    def lookup(self, latitude=9.0, longitude=78.125):
        return local_climate_lookup.lookup_local_climate(
            latitude,
            longitude,
            dataset_path=self.dataset_path,
        )

    def test_returns_nearest_cell_distance_provenance_and_monthly_units(self):
        result = self.lookup(latitude=9.001, longitude=78.125)

        self.assertEqual(result["status"], "available")
        self.assertEqual(result["reference_period"], {"start_year": 1991, "end_year": 2020})
        self.assertEqual(result["grid_location"]["method"], "nearest_grid_cell")
        self.assertLess(result["grid_location"]["distance_m"], 200)
        self.assertEqual(result["months"]["01"]["temperature_c"], 25)
        self.assertEqual(result["months"]["01"]["precipitation_mm_month"], 10)
        self.assertTrue(result["context_only"])
        self.assertIn("not inserted into prediction inputs", result["warning"])

    def test_outside_coverage_does_not_return_a_distant_grid_cell(self):
        result = self.lookup(latitude=12.0, longitude=80.0)

        self.assertEqual(result["status"], "outside_coverage")
        self.assertIsNone(result["grid_location"])
        self.assertEqual(result["months"], {})

    def test_missing_month_values_are_reported_without_replacing_them(self):
        dataset = fixture_dataset()
        dataset["cells"][0]["months"]["01"]["precipitation_mm_month"] = None
        self.write_dataset(dataset)

        result = self.lookup()

        self.assertEqual(result["status"], "partial")
        self.assertIsNone(result["months"]["01"]["precipitation_mm_month"])

    def test_missing_dataset_is_reported(self):
        self.dataset_path.unlink()

        result = local_climate_lookup.lookup_local_climate(
            9.0,
            78.125,
            dataset_path=self.dataset_path,
        )

        self.assertEqual(result["status"], "not_installed")
        self.assertEqual(result["months"], {})

    def test_invalid_coordinates_and_invalid_dataset_are_rejected(self):
        with self.assertRaises(ValueError):
            self.lookup(latitude=91, longitude=0)

        self.dataset_path.write_text("{", encoding="utf-8")
        local_climate_lookup._load_cached.cache_clear()
        with self.assertRaises(local_climate_lookup.ClimateDatasetError):
            self.lookup()

    def test_lookup_does_not_use_network(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("network request")):
            result = self.lookup()
        self.assertEqual(result["status"], "available")

    def test_climate_endpoint_uses_only_the_local_dataset(self):
        expected = self.lookup()
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with (
                patch.object(geospatial, "lookup_local_climate", return_value=expected),
                patch("urllib.request.urlopen", side_effect=AssertionError("network request")),
            ):
                response = TestClient(app).get(
                    "/geospatial/climate-lookup",
                    params={"latitude": 9.0, "longitude": 78.125},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "available")

    def test_combined_location_lookup_keeps_soil_and_climate_independent_and_local(self):
        soil = {"inputs": {"ph": 7.1}}
        climate = self.lookup()
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with (
                patch.object(geospatial, "lookup_local_soil", return_value=soil),
                patch.object(geospatial, "lookup_local_climate", return_value=climate),
                patch("urllib.request.urlopen", side_effect=AssertionError("network request")),
            ):
                response = TestClient(app).post(
                    "/geospatial/local-lookup",
                    json={"latitude": 9.0, "longitude": 78.125},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["soil"]["inputs"], {"ph": 7.1})
        self.assertEqual(response.json()["climate"]["status"], "available")
        self.assertIsNone(response.json()["soil_error"])
        self.assertIsNone(response.json()["climate_error"])


class ClimateInstallerTests(unittest.TestCase):
    def test_normal_calculation_uses_correct_units_and_rainfall_period(self):
        features = {}
        for parameter, values in {
            "T2M": 25.0,
            "RH2M": 70.0,
            "PRECTOTCORR": 2.0,
        }.items():
            features[parameter] = {
                "features": [{
                    "geometry": {"coordinates": [78.125, 9.0, 36.06]},
                    "properties": {
                        "parameter": {
                            parameter: {
                                f"{year}{month:02d}": values
                                for year in range(1991, 2021)
                                for month in range(1, 13)
                            }
                        }
                    },
                }],
            }

        dataset = build_climate_dataset(
            features,
            retrieved_at="2026-10-27T00:00:00+00:00",
        )
        january = dataset["cells"][0]["months"]["01"]
        february = dataset["cells"][0]["months"]["02"]

        self.assertEqual(january["temperature_c"], 25)
        self.assertEqual(january["relative_humidity_pct"], 70)
        self.assertEqual(january["precipitation_mm_month"], 62)
        expected_february_rain = sum(
            2 * calendar.monthrange(year, 2)[1]
            for year in range(1991, 2021)
        ) / 30
        self.assertEqual(february["precipitation_mm_month"], round(expected_february_rain, 3))

    def test_completed_parameter_download_is_reused_on_resume(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            cache_path = Path(temporary_directory) / (
                f"T2M_{prepare_climate_data.START_YEAR}_{prepare_climate_data.END_YEAR}.json"
            )
            cache_path.write_text(json.dumps({
                "features": [{
                    "geometry": {"coordinates": [78.125, 9.0, 36.06]},
                    "properties": {
                        "parameter": {"T2M": {"199101": 25.0}},
                    },
                }],
            }), encoding="utf-8")
            with patch(
                "scripts.prepare_climate_data.urlopen",
                side_effect=AssertionError("network request"),
            ):
                payload, digest, retrieved_at = prepare_climate_data._download_parameter(
                    "T2M",
                    Path(temporary_directory),
                )

        self.assertIn("features", payload)
        self.assertEqual(len(digest), 64)
        self.assertIsInstance(retrieved_at, str)
