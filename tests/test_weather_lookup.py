import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from fastapi.testclient import TestClient

from backend.api import geospatial
from backend.api.prediction import PredictionRequest
from backend.main import app
from backend.schema import FEATURES
from backend.services import location_name, weather_lookup


def forecast_payload(overrides=None):
    payload = {
        "latitude": 13.04,
        "longitude": 80.25,
        "elevation": 15,
        "timezone": "Asia/Kolkata",
        "current_units": {
            "time": "iso8601",
            "interval": "seconds",
            "temperature_2m": "°C",
            "relative_humidity_2m": "%",
            "precipitation": "mm",
            "soil_temperature_0cm": "°C",
            "soil_moisture_0_to_1cm": "m³/m³",
        },
        "current": {
            "time": "2026-10-27T09:45",
            "interval": 900,
            "temperature_2m": 29.3,
            "relative_humidity_2m": 57,
            "precipitation": 0.0,
            "soil_temperature_0cm": 30.7,
            "soil_moisture_0_to_1cm": 0.23,
        },
    }
    if overrides:
        payload.update(overrides)
    return payload


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.payload


class CurrentWeatherLookupTests(unittest.TestCase):
    def setUp(self):
        weather_lookup.clear_weather_cache()
        location_name.clear_location_name_cache()

    def tearDown(self):
        weather_lookup.clear_weather_cache()
        location_name.clear_location_name_cache()

    def test_returns_attributed_current_values_and_accurate_precipitation_period(self):
        with patch(
            "backend.services.weather_lookup.urlopen",
            return_value=FakeResponse(forecast_payload()),
        ) as urlopen:
            result = weather_lookup.lookup_current_weather(13.05539, 80.22194)

        self.assertEqual(result["status"], "available")
        self.assertEqual(result["properties"]["temperature_2m"]["value"], 29.3)
        self.assertEqual(result["properties"]["temperature_2m"]["units"], "°C")
        precipitation = result["properties"]["precipitation"]
        self.assertEqual(precipitation["value"], 0)
        self.assertEqual(precipitation["units"], "mm")
        self.assertIn("preceding 900 seconds", precipitation["temporal_definition"])
        self.assertEqual(result["grid_location"]["timezone"], "Asia/Kolkata")
        self.assertEqual(result["license"], "CC BY 4.0")
        self.assertTrue(result["source_url"].startswith("https://open-meteo.com/"))
        self.assertTrue(any("not been used to populate" in warning for warning in result["warnings"]))
        request = urlopen.call_args.args[0]
        self.assertNotIn("apikey", request.full_url.lower())

    def test_missing_values_are_partial_and_are_never_converted_to_zero(self):
        payload = forecast_payload()
        payload["current"]["soil_moisture_0_to_1cm"] = None

        with patch(
            "backend.services.weather_lookup.urlopen",
            return_value=FakeResponse(payload),
        ):
            result = weather_lookup.lookup_current_weather(13.05539, 80.22194)

        self.assertEqual(result["status"], "partial")
        self.assertNotIn("soil_moisture_0_to_1cm", result["properties"])
        self.assertIn("soil_moisture_0_to_1cm", result["unavailable_properties"])

    def test_provider_failure_returns_unavailable_without_affecting_callers(self):
        with patch(
            "backend.services.weather_lookup.urlopen",
            side_effect=URLError("offline"),
        ):
            result = weather_lookup.lookup_current_weather(13.05539, 80.22194)

        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["properties"], {})
        self.assertEqual(len(result["unavailable_properties"]), 5)
        self.assertIn("could not be reached", result["warnings"][0])

    def test_repeated_nearby_requests_use_the_short_lived_cache(self):
        with patch(
            "backend.services.weather_lookup.urlopen",
            return_value=FakeResponse(forecast_payload()),
        ) as urlopen:
            weather_lookup.lookup_current_weather(13.05539, 80.22194)
            weather_lookup.lookup_current_weather(13.0554, 80.22195)

        urlopen.assert_called_once()

    def test_invalid_coordinates_are_rejected_before_provider_request(self):
        with patch("backend.services.weather_lookup.urlopen") as urlopen:
            with self.assertRaises(ValueError):
                weather_lookup.lookup_current_weather(91, 0)
        urlopen.assert_not_called()

    def test_rate_limit_has_a_clear_unavailable_status(self):
        from urllib.error import HTTPError

        with patch(
            "backend.services.weather_lookup.urlopen",
            side_effect=HTTPError("https://api.open-meteo.com/", 429, "Rate limited", {}, None),
        ):
            result = weather_lookup.lookup_current_weather(13.05539, 80.22194)

        self.assertEqual(result["status"], "unavailable")
        self.assertIn("rate-limited", result["warnings"][0])

    def test_malformed_provider_data_is_not_returned_as_weather(self):
        payload = forecast_payload()
        payload["current"]["temperature_2m"] = float("nan")

        with patch(
            "backend.services.weather_lookup.urlopen",
            return_value=FakeResponse(payload),
        ):
            result = weather_lookup.lookup_current_weather(13.05539, 80.22194)

        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["properties"], {})


class LocationDataEndpointTests(unittest.TestCase):
    def test_authenticated_location_data_endpoint_combines_independent_sources(self):
        soil = {
            "latitude": 13.05539,
            "longitude": 80.22194,
            "dataset_status": "partial",
            "properties": {},
            "context_properties": {},
            "inputs": {"ph": 7.1},
            "available_properties": ["ph"],
            "unavailable_properties": ["N", "P", "K", "temperature", "humidity", "rainfall"],
            "provenance": None,
            "lookup": None,
            "warnings": [],
        }
        weather = {
            "status": "available",
            "source": "Open-Meteo Forecast API (Best Match)",
            "license": "CC BY 4.0",
            "source_url": "https://open-meteo.com/",
            "license_url": "https://open-meteo.com/en/licence",
            "properties": {},
            "unavailable_properties": [],
            "retrieved_at": "2026-10-27T09:45",
            "interval_seconds": 900,
            "grid_location": {},
            "warnings": [],
        }
        place = {
            "status": "available",
            "name": "Chennai, Tamil Nadu",
            "source": "OpenStreetMap Nominatim",
            "source_url": "https://nominatim.openstreetmap.org/",
            "attribution_url": "https://www.openstreetmap.org/copyright",
            "attribution": "© OpenStreetMap contributors",
        }
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with (
                patch.object(geospatial, "lookup_local_soil", return_value=soil),
                patch.object(geospatial, "lookup_current_weather", return_value=weather),
                patch.object(geospatial, "lookup_location_name", return_value=place),
            ):
                response = TestClient(app).get(
                    "/location-data",
                    params={"latitude": 13.05539, "longitude": 80.22194},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["soil"]["inputs"], {"ph": 7.1})
        self.assertEqual(data["location_name"], place)
        self.assertEqual(data["weather"]["source"], weather["source"])
        self.assertEqual(data["weather_model_inputs"], {})

    def test_weather_is_returned_even_when_local_soil_dataset_fails(self):
        weather = {
            "status": "available",
            "source": "Open-Meteo Forecast API (Best Match)",
            "license": "CC BY 4.0",
            "source_url": "https://open-meteo.com/",
            "license_url": "https://open-meteo.com/en/licence",
            "properties": {},
            "unavailable_properties": [],
            "retrieved_at": "2026-10-27T09:45",
            "interval_seconds": 900,
            "grid_location": {},
            "warnings": [],
        }
        place = {
            "status": "unavailable",
            "name": None,
            "source": "OpenStreetMap Nominatim",
            "source_url": "https://nominatim.openstreetmap.org/",
            "attribution_url": "https://www.openstreetmap.org/copyright",
            "attribution": "© OpenStreetMap contributors",
            "warning": "Location-name service unavailable.",
        }
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            with (
                patch.object(
                    geospatial,
                    "lookup_local_soil",
                    side_effect=geospatial.SoilDatasetError("broken local raster"),
                ),
                patch.object(geospatial, "lookup_current_weather", return_value=weather),
                patch.object(geospatial, "lookup_location_name", return_value=place),
            ):
                response = TestClient(app).get(
                    "/location-data",
                    params={"latitude": 13.05539, "longitude": 80.22194},
                )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["soil"])
        self.assertIsNotNone(response.json()["soil_error"])
        self.assertEqual(response.json()["weather"]["status"], "available")
        self.assertEqual(response.json()["location_name"]["status"], "unavailable")

    def test_endpoint_rejects_invalid_coordinates(self):
        app.dependency_overrides[geospatial.require_authenticated_user] = (
            lambda: "synthetic-test-user"
        )
        try:
            response = TestClient(app).get(
                "/location-data",
                params={"latitude": 91, "longitude": 0},
            )
        finally:
            app.dependency_overrides.pop(geospatial.require_authenticated_user, None)
        self.assertEqual(response.status_code, 422)

    def test_weather_context_is_stored_outside_the_model_feature_vector(self):
        weather_context = {
            "source": "Open-Meteo Forecast API (Best Match)",
            "properties": {"temperature_2m": {"value": 29.3}},
        }
        request = PredictionRequest.model_validate({
            "N": 90,
            "P": 42,
            "K": 43,
            "temperature": 22,
            "humidity": 70,
            "ph": 6.5,
            "rainfall": 202,
            "advisory_context": {"weather_context": weather_context},
        })

        self.assertEqual(FEATURES, ("N", "P", "K", "temperature", "humidity", "ph", "rainfall"))
        self.assertEqual(request.model_dump(exclude={"advisory_context"})["temperature"], 22)
        self.assertEqual(
            request.advisory_context.weather_context,
            weather_context,
        )


if __name__ == "__main__":
    unittest.main()
