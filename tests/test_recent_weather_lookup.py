from __future__ import annotations

import json
import unittest
from datetime import date, datetime, timezone
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

from backend.services import recent_weather_lookup
from backend.services.recent_weather_lookup import (
    RecentWeatherError,
    lookup_recent_weather,
)


FIXED_NOW = datetime(2026, 10, 27, 12, 0, tzinfo=timezone.utc)


def nasa_payload(
    *,
    temperature_units: str = "C",
    temperature_values: dict[str, float] | None = None,
) -> dict:
    dates = ("20261021", "20261022", "20261023", "20261024", "20261025", "20261026")
    default_values = {
        "20261021": 26.4,
        "20261022": 27.3,
        "20261023": -999.0,
        "20261024": -999.0,
        "20261025": -999.0,
        "20261026": -999.0,
    }
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [78.657, 11.127, 163.36]},
        "properties": {
            "parameter": {
                "T2M": temperature_values or default_values,
                "RH2M": {
                    "20261021": 88.1,
                    "20261022": 86.2,
                    "20261023": -999,
                    "20261024": -999,
                    "20261025": -999,
                    "20261026": -999,
                },
                "PRECTOTCORR": {
                    "20261021": 12.06,
                    "20261022": 8.79,
                    "20261023": -999,
                    "20261024": -999,
                    "20261025": -999,
                    "20261026": -999,
                },
            }
        },
        "header": {
            "fill_value": -999.0,
            "time_standard": "UTC",
            "start": "20260828",
            "end": "20261026",
        },
        "messages": [],
        "parameters": {
            "T2M": {"units": temperature_units, "longname": "Temperature at 2 Meters"},
            "RH2M": {"units": "%", "longname": "Relative Humidity at 2 Meters"},
            "PRECTOTCORR": {"units": "mm/day", "longname": "Precipitation Corrected"},
        },
    }


def mock_response(payload: dict) -> Mock:
    response = Mock()
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock(return_value=False)
    response.read.return_value = json.dumps(payload).encode("utf-8")
    return response


class RecentWeatherLookupTests(unittest.TestCase):
    def setUp(self):
        recent_weather_lookup.clear_recent_weather_cache()

    def tearDown(self):
        recent_weather_lookup.clear_recent_weather_cache()

    def test_builds_daily_query_and_returns_latest_valid_values_with_units_and_delay(self):
        with patch(
            "backend.services.recent_weather_lookup.urlopen",
            return_value=mock_response(nasa_payload()),
        ) as open_url:
            result = lookup_recent_weather(
                11.1271,
                78.6569,
                now=FIXED_NOW,
            )

        request = open_url.call_args.args[0]
        query = parse_qs(urlparse(request.full_url).query)
        self.assertEqual(query["parameters"], ["T2M,RH2M,PRECTOTCORR"])
        self.assertEqual(query["community"], ["AG"])
        self.assertEqual(query["longitude"], ["78.66"])
        self.assertEqual(query["latitude"], ["11.13"])
        self.assertEqual(query["start"], ["20260828"])
        self.assertEqual(query["end"], ["20261026"])
        self.assertEqual(query["time-standard"], ["UTC"])
        self.assertEqual(open_url.call_args.kwargs["timeout"], 10)

        self.assertEqual(result["status"], "available")
        self.assertEqual(result["latest_observation_date"], "2026-10-22")
        self.assertEqual(result["data_delay_days"], 5)
        self.assertEqual(result["observations"]["temperature"]["value"], 27.3)
        self.assertEqual(result["observations"]["temperature"]["units"], "°C")
        self.assertEqual(result["observations"]["humidity"]["value"], 86.2)
        self.assertEqual(result["observations"]["humidity"]["units"], "%")
        self.assertEqual(result["observations"]["rainfall"]["value"], 8.79)
        self.assertEqual(result["observations"]["rainfall"]["units"], "mm/day")
        self.assertFalse(result["model_compatible"])

    def test_caches_same_location_and_date_window(self):
        with patch(
            "backend.services.recent_weather_lookup.urlopen",
            return_value=mock_response(nasa_payload()),
        ) as open_url:
            first = lookup_recent_weather(11.1271, 78.6569, now=FIXED_NOW)
            second = lookup_recent_weather(11.1272, 78.6570, now=FIXED_NOW)

        self.assertEqual(open_url.call_count, 1)
        self.assertEqual(second["latitude"], 11.1272)
        self.assertEqual(second["longitude"], 78.657)
        self.assertEqual(first["observations"], second["observations"])

    def test_timeout_is_reported_as_a_lookup_error(self):
        with patch(
            "backend.services.recent_weather_lookup.urlopen",
            side_effect=TimeoutError("timeout"),
        ):
            with self.assertRaisesRegex(RecentWeatherError, "failed or timed out"):
                lookup_recent_weather(11.1271, 78.6569, now=FIXED_NOW)

    def test_missing_daily_values_are_not_replaced_with_zero_or_defaults(self):
        payload = nasa_payload(temperature_values={
            date(2026, 10, 22).strftime("%Y%m%d"): -999.0,
        })
        payload["properties"]["parameter"]["RH2M"] = {"20261022": -999.0}
        payload["properties"]["parameter"]["PRECTOTCORR"] = {"20261022": -999.0}
        with patch(
            "backend.services.recent_weather_lookup.urlopen",
            return_value=mock_response(payload),
        ):
            result = lookup_recent_weather(11.1271, 78.6569, now=FIXED_NOW)

        self.assertEqual(result["status"], "no_data")
        self.assertIsNone(result["latest_observation_date"])
        self.assertTrue(all(value is None for value in result["observations"].values()))

    def test_unexpected_api_units_and_invalid_coordinates_are_rejected(self):
        with patch(
            "backend.services.recent_weather_lookup.urlopen",
            return_value=mock_response(nasa_payload(temperature_units="K")),
        ):
            with self.assertRaisesRegex(RecentWeatherError, "unexpected units"):
                lookup_recent_weather(11.1271, 78.6569, now=FIXED_NOW)

        with patch("backend.services.recent_weather_lookup.urlopen") as open_url:
            with self.assertRaises(ValueError):
                lookup_recent_weather(91, 78.6569, now=FIXED_NOW)
        open_url.assert_not_called()


if __name__ == "__main__":
    unittest.main()
