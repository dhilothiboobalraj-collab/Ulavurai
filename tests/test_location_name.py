import json
import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import URLError

from backend.services import location_name


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.payload


class LocationNameLookupTests(unittest.TestCase):
    def setUp(self):
        location_name.clear_location_name_cache()

    def tearDown(self):
        location_name.clear_location_name_cache()

    def test_returns_nearby_place_name_with_openstreetmap_attribution(self):
        payload = {
            "display_name": "Madurai, Tamil Nadu, India",
            "address": {
                "city": "Madurai",
                "state": "Tamil Nadu",
                "country": "India",
            },
        }
        with patch(
            "backend.services.location_name.urlopen",
            return_value=FakeResponse(payload),
        ) as urlopen, patch("backend.services.location_name.time.sleep"):
            result = location_name.lookup_location_name(9.93, 78.12)

        self.assertEqual(result["status"], "available")
        self.assertEqual(result["name"], "Madurai, Tamil Nadu")
        self.assertEqual(result["source"], "OpenStreetMap Nominatim")
        self.assertIn("OpenStreetMap contributors", result["attribution"])
        self.assertEqual(
            result["attribution_url"],
            "https://www.openstreetmap.org/copyright",
        )
        request = urlopen.call_args.args[0]
        self.assertIn("format=jsonv2", request.full_url)
        self.assertEqual(
            request.get_header("User-agent"),
            "Ulavurai/1.0 (location label lookup)",
        )

    def test_repeated_coordinate_uses_cached_result(self):
        payload = {
            "display_name": "Salem, Tamil Nadu, India",
            "address": {"city": "Salem", "state": "Tamil Nadu"},
        }
        with patch(
            "backend.services.location_name.urlopen",
            return_value=FakeResponse(payload),
        ) as urlopen, patch("backend.services.location_name.time.sleep"):
            first = location_name.lookup_location_name(11.66, 78.14)
            second = location_name.lookup_location_name(11.66, 78.14)

        self.assertEqual(first, second)
        urlopen.assert_called_once()

    def test_invalid_coordinates_are_rejected_without_network_request(self):
        with patch("backend.services.location_name.urlopen") as urlopen:
            with self.assertRaises(ValueError):
                location_name.lookup_location_name(91, 0)
        urlopen.assert_not_called()

    def test_provider_failure_is_reported_as_unavailable_location_name(self):
        with patch(
            "backend.services.location_name.urlopen",
            side_effect=URLError("offline"),
        ), patch("backend.services.location_name.time.sleep"):
            result = location_name.lookup_location_name(9.93, 78.12)

        self.assertEqual(result["status"], "unavailable")
        self.assertIsNone(result["name"])
        self.assertIn("could not be retrieved", result["warning"])


if __name__ == "__main__":
    unittest.main()
