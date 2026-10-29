import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from scripts import prepare_geospatial_data


class _ResponseHeaders:
    def get_content_type(self):
        return "image/tiff"


class _RasterResponse:
    status = 200
    headers = _ResponseHeaders()

    def __init__(self, content):
        self.content = content

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def read(self):
        return self.content


class GeospatialPreparationTests(unittest.TestCase):
    def test_wcs_urls_use_documented_coverages_without_api_keys(self):
        metadata = json.loads(
            (
                prepare_geospatial_data.DEFAULT_DATA_DIRECTORY
                / prepare_geospatial_data.METADATA_NAME
            ).read_text(encoding="utf-8")
        )

        for definition in metadata["properties"].values():
            query = parse_qs(
                urlparse(
                    prepare_geospatial_data._coverage_url(
                        definition["wcs_map"], definition["coverage_id"]
                    )
                ).query
            )
            self.assertEqual(query["COVERAGEID"], [definition["coverage_id"]])
            self.assertEqual(query["SERVICE"], ["WCS"])
            self.assertEqual(query["VERSION"], ["2.0.1"])
            self.assertEqual(query["SUBSET"], ["Long(76,81)", "Lat(8,14)"])
            self.assertNotIn("key", query)
            self.assertNotIn("api_key", query)

    def test_preparation_validates_and_stages_real_downloads_before_replacement(self):
        source_directory = prepare_geospatial_data.DEFAULT_DATA_DIRECTORY
        metadata_source = json.loads(
            (source_directory / prepare_geospatial_data.METADATA_NAME).read_text(
                encoding="utf-8"
            )
        )
        source_files = [
            (source_directory / metadata_source["properties"][name]["file"]).read_bytes()
            for name in ("ph", "total_nitrogen")
        ]
        source_files.extend([source_files[0]] * (
            len(metadata_source["properties"]) - len(source_files)
        ))

        with tempfile.TemporaryDirectory() as temporary_directory:
            output_directory = Path(temporary_directory)
            (output_directory / prepare_geospatial_data.METADATA_NAME).write_text(
                json.dumps(metadata_source), encoding="utf-8"
            )
            with patch(
                "scripts.prepare_geospatial_data.urlopen",
                side_effect=[_RasterResponse(content) for content in source_files],
            ):
                output_files = prepare_geospatial_data.prepare_data(output_directory)

            self.assertEqual(len(output_files), len(metadata_source["properties"]))
            self.assertEqual(
                [hashlib.sha256(path.read_bytes()).hexdigest() for path in output_files],
                [hashlib.sha256(content).hexdigest() for content in source_files],
            )
