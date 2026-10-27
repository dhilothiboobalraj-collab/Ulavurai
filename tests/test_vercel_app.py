import json
import os
import subprocess
import sys
import unittest
from pathlib import Path


class VercelApplicationTests(unittest.TestCase):
    @staticmethod
    def load_vercel_configuration(cors_origins):
        environment = os.environ.copy()
        environment["VERCEL"] = "1"
        environment["CORS_ALLOWED_ORIGINS"] = cors_origins
        environment.pop("CORS_ORIGINS", None)
        script = """
import json
from fastapi.middleware.cors import CORSMiddleware
from app import app

cors = next(
    middleware
    for middleware in app.user_middleware
    if middleware.cls is CORSMiddleware
)
print(json.dumps({
    "paths": sorted(app.openapi()["paths"]),
    "allow_origins": cors.kwargs["allow_origins"],
}))
"""
        result = subprocess.run(
            [sys.executable, "-c", script],
            cwd=Path(__file__).resolve().parents[1],
            env=environment,
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)

    @classmethod
    def setUpClass(cls):
        cls.same_origin_configuration = cls.load_vercel_configuration("")
        cls.explicit_origin_configuration = cls.load_vercel_configuration(
            "https://seasonsense.vercel.app"
        )

    def test_api_routes_are_registered_under_vercel_prefix(self):
        paths = self.same_origin_configuration["paths"]

        self.assertIn("/api/health", paths)
        self.assertIn("/api/predict", paths)
        self.assertIn("/api/predict/preview", paths)
        self.assertIn("/api/geospatial/local-lookup", paths)
        self.assertIn("/api/location-data", paths)

    def test_vercel_same_origin_does_not_allow_development_cors_origins(self):
        self.assertEqual(self.same_origin_configuration["allow_origins"], [])

    def test_vercel_cors_uses_only_the_configured_https_origin(self):
        self.assertEqual(
            self.explicit_origin_configuration["allow_origins"],
            ["https://seasonsense.vercel.app"],
        )


if __name__ == "__main__":
    unittest.main()
