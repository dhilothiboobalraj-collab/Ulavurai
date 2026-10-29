import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
import numpy as np
import pandas as pd
from pydantic import ValidationError
import rasterio
from rasterio.transform import from_origin

from backend.api import geospatial, prediction
from backend.main import app
from backend.schema import FEATURES
from backend.services import local_soil_lookup
from backend.services.predictor import CropPredictor
from scripts.report_npk_coverage import build_report


class LocalSoilLookupTests(unittest.TestCase):
    def test_soil_lookup_endpoint_is_registered_on_the_expected_api_path(self):
        self.assertIn("/geospatial/soil-lookup", app.openapi()["paths"])
        self.assertIn("/location-data", app.openapi()["paths"])

    def test_authenticated_endpoint_returns_the_bundled_local_raster_lookup(self):
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            response = TestClient(app).post(
                "/geospatial/soil-lookup",
                json={"latitude": 9.93, "longitude": 78.12},
            )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertAlmostEqual(result["inputs"]["ph"], 7.3)
        self.assertNotIn("N", result["inputs"])
        self.assertIn("temperature", result["unavailable_properties"])

    def test_real_combined_endpoint_returns_valid_soil_and_climate_without_external_calls(self):
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with patch("urllib.request.urlopen", side_effect=AssertionError("network request")):
                valid_response = TestClient(app).post(
                    "/geospatial/local-lookup",
                    json={"latitude": 11.1271, "longitude": 78.6569},
                )
                nodata_response = TestClient(app).post(
                    "/geospatial/local-lookup",
                    json={"latitude": 11.66, "longitude": 78.14},
                )
                location_response = TestClient(app).get(
                    "/location-data",
                    params={"latitude": 11.1271, "longitude": 78.6569},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(valid_response.status_code, 200)
        valid = valid_response.json()
        self.assertAlmostEqual(valid["soil"]["inputs"]["ph"], 7.4)
        self.assertEqual(valid["climate"]["status"], "available")
        self.assertEqual(len(valid["climate"]["months"]), 12)
        self.assertAlmostEqual(
            valid["climate"]["months"]["01"]["temperature_c"], 23.813
        )
        self.assertIsInstance(
            valid["climate"]["months"]["01"]["precipitation_mm_month"], float
        )
        self.assertGreaterEqual(
            valid["climate"]["months"]["01"]["precipitation_mm_month"], 0
        )
        self.assertTrue(valid["climate"]["context_only"])
        self.assertNotIn("temperature", valid["soil"]["inputs"])

        self.assertEqual(nodata_response.status_code, 200)
        nodata = nodata_response.json()
        self.assertEqual(nodata["soil"]["dataset_status"], "no_data")
        self.assertNotIn("ph", nodata["soil"]["inputs"])
        self.assertEqual(nodata["climate"]["status"], "available")
        self.assertEqual(len(nodata["climate"]["months"]), 12)
        self.assertNotEqual(
            valid["climate"]["months"]["01"]["temperature_c"],
            nodata["climate"]["months"]["01"]["temperature_c"],
        )
        self.assertNotEqual(
            valid["climate"]["months"]["01"]["precipitation_mm_month"],
            nodata["climate"]["months"]["01"]["precipitation_mm_month"],
        )
        self.assertEqual(
            valid["soil"]["inputs"],
            {"ph": valid["soil"]["properties"]["ph"]["value"]},
        )
        self.assertFalse(
            {"N", "P", "K", "temperature", "humidity", "rainfall"}
            .intersection(valid["soil"]["inputs"])
        )
        self.assertNotIn("recent_weather", valid)
        self.assertNotIn("recent_weather", nodata)
        self.assertEqual(location_response.status_code, 200)
        location_data = location_response.json()
        self.assertEqual(location_data["climate"]["status"], "available")
        self.assertNotIn("weather", location_data)
        self.assertNotIn("location_name", location_data)

    def test_soil_lookup_failure_does_not_hide_historical_climate(self):
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with (
                patch.object(
                    geospatial,
                    "lookup_local_soil",
                    return_value={"inputs": {"ph": 7.4}},
                ),
                patch.object(
                    geospatial,
                    "lookup_local_climate",
                    return_value={"status": "available"},
                ),
            ):
                response = TestClient(app).post(
                    "/geospatial/local-lookup",
                    json={"latitude": 11.1271, "longitude": 78.6569},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["soil"]["inputs"]["ph"], 7.4)
        self.assertEqual(result["climate"]["status"], "available")

    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.csv_path = self.root / "soil_samples.csv"
        self.metadata_path = self.root / "metadata.json"
        self.metadata = {
            "dataset_name": "Test soil observations",
            "source": "Local synthetic test fixture only",
            "citation": "Unit test fixture; not real soil data",
            "license": "Test-only",
            "spatial_resolution_m": 100,
            "max_lookup_distance_m": 1000,
            "missing_values": ["", "NA", "NoData", "-9999"],
            "properties": {
                name: {
                    "column": name,
                    "units": "kg/ha" if name != "ph" else "pH",
                    "value_type": "direct_measurement",
                    "soil_depth_cm": 15,
                }
                for name in ("N", "P", "K", "ph")
            },
        }
        self.write_metadata(self.metadata)
        self.write_rows([{
            "latitude": "11.66",
            "longitude": "78.14",
            "N": "90",
            "P": "42",
            "K": "43",
            "ph": "6.5",
        }])

    def tearDown(self):
        self.temporary_directory.cleanup()

    def write_metadata(self, metadata):
        self.metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        local_soil_lookup._load_cached.cache_clear()

    def write_rows(self, rows):
        columns = ["latitude", "longitude", "N", "P", "K", "ph"]
        with self.csv_path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=columns)
            writer.writeheader()
            writer.writerows(rows)
        local_soil_lookup._load_cached.cache_clear()

    def lookup(self, latitude=11.66, longitude=78.14):
        return local_soil_lookup.lookup_local_soil(
            latitude,
            longitude,
            csv_path=self.csv_path,
            metadata_path=self.metadata_path,
        )

    def test_valid_coordinate_returns_values_units_and_provenance(self):
        result = self.lookup()

        self.assertEqual(result["inputs"], {"ph": 6.5})
        self.assertEqual(result["dataset_status"], "partial")
        self.assertEqual(result["properties"]["ph"]["soil_depth_cm"], 15)
        for nutrient in ("N", "P", "K"):
            self.assertEqual(
                result["nutrient_availability"][nutrient]["status"],
                "incompatible",
            )
            self.assertFalse(result["nutrient_availability"][nutrient]["available"])
            self.assertIsNone(result["nutrient_availability"][nutrient]["value"])
            self.assertEqual(
                result["nutrient_availability"][nutrient]["units"], "kg/ha"
            )
            self.assertTrue(
                result["nutrient_availability"][nutrient]["missing_requirements"]
            )
        self.assertEqual(result["provenance"]["citation"], self.metadata["citation"])
        self.assertEqual(result["lookup"]["distance_m"], 0)
        self.assertEqual(
            result["unavailable_properties"],
            ["N", "P", "K", "temperature", "humidity", "rainfall"],
        )

    def test_explicit_compatibility_configuration_rejects_all_unverified_nutrients(self):
        self.assertEqual(
            set(local_soil_lookup.NUTRIENT_COMPATIBILITY),
            {"N", "P", "K"},
        )
        for nutrient, definition in local_soil_lookup.NUTRIENT_COMPATIBILITY.items():
            self.assertIn("content in soil", definition["model_definition"])
            self.assertIsNone(definition["model_units"])
            self.assertFalse(definition["source_eligibility"])
            self.assertEqual(
                definition["training_source_doi"],
                "10.6084/m9.figshare.26308696.v2",
            )

        result = self.lookup()
        self.assertFalse({"N", "P", "K"}.intersection(result["inputs"]))

    def test_installed_coverage_report_does_not_claim_unsupported_coverage_or_accuracy(self):
        report = build_report()

        self.assertFalse(report["compatible_npk_source_installed"])
        self.assertEqual(
            report["all_three_npk_coverage_percent_of_installed_grid"],
            0.0,
        )
        self.assertIsNone(report["independent_test_locations"])
        self.assertIsNone(report["accuracy_metrics"])
        self.assertEqual(
            {
                nutrient: details["coverage_percent_of_installed_grid"]
                for nutrient, details in report["model_input_coverage"].items()
            },
            {"N": 0.0, "P": 0.0, "K": 0.0},
        )
        climate = report["climate_coverage"]
        self.assertTrue(climate["installed"])
        self.assertEqual(climate["grid_cells"], 180)
        self.assertEqual(climate["grid_center_bounds_wgs84"], [75.625, 7.5, 82.5, 14.5])
        self.assertEqual(climate["reference_period"], {"start_year": 1991, "end_year": 2020})
        self.assertEqual(
            climate["parameters"]["temperature_c"]["units"],
            "°C",
        )
        self.assertEqual(
            climate["parameters"]["temperature_c"]["cells_with_all_months"],
            180,
        )
        self.assertEqual(
            climate["parameters"]["temperature_c"]["coverage_percent_of_installed_grid"],
            100.0,
        )
        self.assertEqual(
            climate["parameters"]["precipitation_mm_month"]["units"],
            "mm/month",
        )
        self.assertIn("not the percentage of farms", climate["no_coverage"])
        self.assertIn("NoData raster cells", report["dataset_coverage"]["no_coverage"])
        self.assertTrue(all(
            details["missing_compatible_cells"] == report["dataset_coverage"]["raster_grid_cells"]
            and details["missing_compatible_percent_of_installed_grid"] == 100.0
            and details["exact_measurements"] == 0
            and details["spatial_estimates"] == 0
            for details in report["model_input_coverage"].values()
        ))
        self.assertTrue(any(
            source["name"] == "NRSC/Bhuvan soils and nutrient-status mapping"
            for source in report["data_sources"]
        ))
        tamil_nadu_source = next(
            source for source in report["data_sources"]
            if source["name"] == "Tamil Nadu Agricultural Department / Tamil Mannvalam"
        )
        self.assertEqual(
            tamil_nadu_source["license"],
            "Underlying dataset license not verified",
        )

    def test_outside_coverage_does_not_return_nearest_unrelated_sample(self):
        result = self.lookup(latitude=12.0, longitude=79.0)

        self.assertEqual(result["dataset_status"], "outside_coverage")
        self.assertEqual(result["inputs"], {})
        self.assertIn("N", result["unavailable_properties"])
        self.assertEqual(
            result["nutrient_availability"]["N"]["status"], "outside_coverage"
        )

    def test_missing_soil_property_and_nodata_are_unavailable(self):
        self.write_rows([{
            "latitude": "11.66",
            "longitude": "78.14",
            "N": "-9999",
            "P": "",
            "K": "NaN",
            "ph": "NaN",
        }])

        result = self.lookup()

        self.assertEqual(result["inputs"], {})
        self.assertEqual(result["available_properties"], [])
        self.assertTrue({"N", "P", "K", "ph"}.issubset(result["unavailable_properties"]))
        self.assertEqual(
            result["nutrient_availability"]["K"]["status"], "no_data"
        )

    def test_invalid_coordinates_are_rejected(self):
        for latitude, longitude in ((91, 0), (0, -181), (float("nan"), 0), (True, 0)):
            with self.subTest(latitude=latitude, longitude=longitude):
                with self.assertRaises(ValueError):
                    self.lookup(latitude, longitude)

    def test_missing_dataset_is_reported_without_fabricating_inputs(self):
        self.csv_path.unlink()
        self.metadata_path.unlink()

        result = self.lookup()

        self.assertEqual(result["dataset_status"], "not_installed")
        self.assertEqual(result["inputs"], {})
        self.assertEqual(
            result["unavailable_properties"],
            list(local_soil_lookup.MODEL_PROPERTIES),
        )

    def test_unreadable_or_incomplete_dataset_is_reported(self):
        self.csv_path.unlink()

        with self.assertRaises(local_soil_lookup.SoilDatasetError):
            self.lookup()

    def test_dataset_without_reuse_license_is_rejected(self):
        self.metadata["license"] = ""
        self.write_metadata(self.metadata)

        with self.assertRaises(local_soil_lookup.SoilDatasetError):
            self.lookup()

    def test_local_lookup_makes_no_external_network_requests(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("network request")):
            result = self.lookup()

            self.assertNotIn("N", result["inputs"])

    def test_soil_endpoint_uses_local_lookup(self):
        request = geospatial.SoilLookupRequest(latitude=11.66, longitude=78.14)
        expected = {"dataset_status": "not_installed", "inputs": {}}
        with patch.object(geospatial, "lookup_local_soil", return_value=expected):
            self.assertEqual(geospatial.soil_lookup(request, "user"), expected)

    def test_soil_endpoint_surfaces_invalid_dataset(self):
        request = geospatial.SoilLookupRequest(latitude=11.66, longitude=78.14)
        with patch.object(
            geospatial,
            "lookup_local_soil",
            side_effect=local_soil_lookup.SoilDatasetError("bad metadata"),
        ):
            with self.assertRaises(HTTPException) as raised:
                geospatial.soil_lookup(request, "user")
        self.assertEqual(raised.exception.status_code, 503)

    def test_model_still_requires_all_inputs_in_existing_feature_order(self):
        self.assertEqual(
            FEATURES,
            ("N", "P", "K", "temperature", "humidity", "ph", "rainfall"),
        )
        with self.assertRaises(ValidationError):
            prediction.PredictionRequest.model_validate({
                "N": 90,
                "P": 42,
                "K": 43,
                "ph": 6.5,
                "temperature": 22,
                "humidity": 70,
            })

    def test_existing_predictor_receives_features_in_saved_model_order(self):
        received_columns = []

        class ModelStub:
            classes_ = ["rice"]

            def predict_proba(self, frame):
                received_columns.extend(frame.columns)
                return [[1.0]]

        predictor = CropPredictor()
        predictor.model = ModelStub()
        predictor.dataset = pd.DataFrame(
            {feature: [1.0, 2.0] for feature in FEATURES}
        )
        values = {feature: 1.5 for feature in FEATURES}

        predictor.predict(values)

        self.assertEqual(tuple(received_columns), FEATURES)


class SoilGridsRasterLookupTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.ph_path = self.root / "ph.tif"
        self.nitrogen_path = self.root / "nitrogen.tif"
        self.metadata_path = self.root / "metadata.json"
        self.metadata = {
            "dataset_name": "Synthetic raster test fixture",
            "dataset_version": "Synthetic test fixture",
            "source": "Test-only",
            "citation": "Synthetic data; not a real soil dataset",
            "license": "Test-only",
            "coverage": "Synthetic EPSG:4326 test rectangle",
            "spatial_resolution_m": 250,
            "properties": {
                "ph": {
                    "file": "ph.tif",
                    "units": "pH",
                    "soil_depth_cm": [0, 5],
                    "scale_factor": 0.1,
                },
                "total_nitrogen": {
                    "file": "nitrogen.tif",
                    "units": "cg/kg",
                    "soil_depth_cm": [0, 5],
                },
            },
        }
        self.metadata_path.write_text(json.dumps(self.metadata), encoding="utf-8")
        self.write_raster(self.ph_path, [[68, 0, 72], [69, 70, 0], [0, 0, 0]])
        self.write_raster(self.nitrogen_path, [[52, 44, 50], [40, 0, 40], [0, 0, 0]])

    def tearDown(self):
        self.temporary_directory.cleanup()

    def write_raster(self, path, values):
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            height=3,
            width=3,
            count=1,
            dtype="int16",
            crs="EPSG:4326",
            transform=from_origin(78.0, 12.0, 0.01, 0.01),
        ) as dataset:
            dataset.write(np.asarray(values, dtype="int16"), 1)
            dataset.write_mask(
                np.asarray(
                    [[255, 255, 255], [255, 0, 255], [255, 255, 255]],
                    dtype="uint8",
                )
            )
        local_soil_lookup._load_raster_cached.cache_clear()

    def lookup(self, latitude=11.995, longitude=78.005):
        return local_soil_lookup.lookup_local_soil(
            latitude,
            longitude,
            ph_raster_path=self.ph_path,
            nitrogen_raster_path=self.nitrogen_path,
            raster_metadata_path=self.metadata_path,
        )

    def test_inside_raster_returns_scaled_ph_and_context_only_total_nitrogen(self):
        result = self.lookup()

        self.assertAlmostEqual(result["inputs"]["ph"], 6.8)
        self.assertEqual(result["properties"]["ph"]["units"], "pH")
        self.assertEqual(result["properties"]["ph"]["soil_depth_cm"], [0, 5])
        self.assertEqual(result["properties"]["ph"]["value_type"], "mapped_estimate")
        self.assertEqual(result["provenance"]["dataset_version"], "Synthetic test fixture")
        self.assertEqual(result["context_properties"]["total_nitrogen"]["value"], 52)
        self.assertEqual(result["context_properties"]["total_nitrogen"]["units"], "cg/kg")
        self.assertNotIn("N", result["inputs"])
        self.assertEqual(
            result["nutrient_availability"]["N"]["status"], "incompatible"
        )
        self.assertEqual(result["nutrient_availability"]["N"]["units"], "cg/kg")
        self.assertEqual(result["lookup"]["method"], "raster_cell")

    def test_coordinate_outside_raster_bounds_has_no_values(self):
        result = self.lookup(latitude=11.995, longitude=78.04)

        self.assertEqual(result["dataset_status"], "outside_coverage")
        self.assertEqual(result["inputs"], {})

    def test_zero_pixel_is_unavailable_without_nearby_substitution(self):
        result = self.lookup(latitude=11.995, longitude=78.015)

        self.assertNotIn("ph", result["inputs"])
        self.assertIn("ph", result["unavailable_properties"])
        self.assertEqual(result["context_properties"]["total_nitrogen"]["value"], 44)

    def test_masked_raster_cell_is_unavailable(self):
        result = self.lookup(latitude=11.985, longitude=78.015)

        self.assertEqual(result["dataset_status"], "no_data")
        self.assertNotIn("ph", result["inputs"])
        self.assertNotIn("total_nitrogen", result["context_properties"])
        self.assertIn("contains no valid SoilGrids value", " ".join(result["warnings"]))

    def test_missing_raster_is_an_explicit_dataset_error(self):
        self.ph_path.unlink()

        with self.assertRaises(local_soil_lookup.SoilDatasetError):
            self.lookup()

    def test_raster_lookup_does_not_make_network_requests(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("network request")):
            result = self.lookup()

        self.assertAlmostEqual(result["inputs"]["ph"], 6.8)

    def test_bundled_soilgrids_extract_returns_a_real_mapped_ph_value(self):
        result = local_soil_lookup.lookup_local_soil(9.93, 78.12)

        self.assertAlmostEqual(result["inputs"]["ph"], 7.3)
        self.assertEqual(result["properties"]["ph"]["source"], "ISRIC SoilGrids 2.0")
        self.assertEqual(result["provenance"]["dataset_version"], "SoilGrids 2.0 (2021 publication)")
        self.assertNotIn("N", result["inputs"])
        self.assertIn("total_nitrogen", result["context_properties"])
        self.assertIn("clay_content", " ".join(result["warnings"]))

    def test_optional_soil_texture_and_carbon_rasters_return_context_only(self):
        definitions = {
            "clay_content": {
                "file": "clay.tif",
                "units": "g/kg",
                "soil_depth_cm": [0, 5],
            },
            "sand_content": {
                "file": "sand.tif",
                "units": "g/kg",
                "soil_depth_cm": [0, 5],
            },
            "silt_content": {
                "file": "silt.tif",
                "units": "g/kg",
                "soil_depth_cm": [0, 5],
            },
            "soil_organic_carbon": {
                "file": "soc.tif",
                "units": "g/kg",
                "soil_depth_cm": [0, 5],
                "scale_factor": 0.1,
            },
        }
        self.metadata["properties"].update(definitions)
        self.metadata_path.write_text(json.dumps(self.metadata), encoding="utf-8")
        for name, definition in definitions.items():
            path = self.root / definition["file"]
            values = [[260, 250, 240], [270, 250, 260], [280, 270, 250]]
            if name == "soil_organic_carbon":
                values = [[150, 140, 130], [160, 150, 140], [170, 160, 150]]
            self.write_raster(path, values)

        result = self.lookup()

        self.assertAlmostEqual(result["inputs"]["ph"], 6.8)
        self.assertEqual(result["context_properties"]["clay_content"]["value"], 260)
        self.assertEqual(result["context_properties"]["sand_content"]["units"], "g/kg")
        self.assertEqual(result["context_properties"]["silt_content"]["value"], 260)
        self.assertEqual(result["context_properties"]["soil_organic_carbon"]["value"], 15)
        self.assertEqual(result["context_properties"]["soil_organic_carbon"]["units"], "g/kg")


if __name__ == "__main__":
    unittest.main()
