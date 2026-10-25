import asyncio
import json
import os
import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

from backend import auth
from backend.api import farmer_guide, history, model, prediction


class _AuthResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def read(self):
        return json.dumps({"id": "verified-user"}).encode()


class AuthenticationTests(unittest.TestCase):
    def test_missing_bearer_token_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(auth.require_authenticated_user(None))
        self.assertEqual(raised.exception.status_code, 401)

    def test_missing_supabase_configuration_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(
                    auth.require_authenticated_user(
                        HTTPAuthorizationCredentials(
                            scheme="Bearer", credentials="example-token"
                        )
                    )
                )
        self.assertEqual(raised.exception.status_code, 503)

    def test_supabase_validates_bearer_token_and_supplies_user_identity(self):
        def fake_urlopen(request, timeout):
            self.assertEqual(
                request.get_header("Authorization"), "Bearer example-token"
            )
            self.assertEqual(
                request.full_url,
                "https://project.example/auth/v1/user",
            )
            self.assertEqual(timeout, 10)
            return _AuthResponse()

        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://project.example/",
                "SUPABASE_PUBLISHABLE_KEY": "example-publishable",
            },
        ):
            with patch.object(auth, "urlopen", fake_urlopen):
                user_id = asyncio.run(
                    auth.require_authenticated_user(
                        HTTPAuthorizationCredentials(
                            scheme="Bearer", credentials="example-token"
                        )
                    )
                )
        self.assertEqual(user_id, "verified-user")

    def test_supabase_rejection_maps_to_unauthorized(self):
        def reject_token(request, timeout):
            error = HTTPError(
                request.full_url, 401, "Unauthorized", None, BytesIO()
            )
            error.close()
            raise error

        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://project.example",
                "SUPABASE_PUBLISHABLE_KEY": "example-publishable",
            },
        ):
            with patch.object(auth, "urlopen", reject_token):
                with self.assertRaises(HTTPException) as raised:
                    asyncio.run(
                        auth.require_authenticated_user(
                            HTTPAuthorizationCredentials(
                                scheme="Bearer", credentials="invalid-token"
                            )
                        )
                    )
        self.assertEqual(raised.exception.status_code, 401)

    def test_data_and_model_routes_require_authenticated_user_dependency(self):
        protected_paths = {
            "/predict",
            "/farmer-guide/predict",
            "/history",
            "/model/metrics",
            "/model/features",
            "/model/importance",
            "/crops",
        }
        routers = (
            prediction.router,
            farmer_guide.router,
            history.router,
            model.router,
            model.crops_router,
        )
        found_paths = set()
        for router in routers:
            for route in router.routes:
                if not isinstance(route, APIRoute) or route.path not in protected_paths:
                    continue
                found_paths.add(route.path)
                dependencies = {
                    dependency.call for dependency in route.dependant.dependencies
                }
                self.assertIn(auth.require_authenticated_user, dependencies)
        self.assertEqual(found_paths, protected_paths)

    def test_clients_cannot_supply_a_user_id_in_protected_request_models(self):
        with self.assertRaises(ValidationError):
            prediction.PredictionRequest.model_validate(
                {
                    "N": 1,
                    "P": 1,
                    "K": 1,
                    "temperature": 20,
                    "humidity": 50,
                    "ph": 6,
                    "rainfall": 100,
                    "user_id": "another-user",
                }
            )
        with self.assertRaises(ValidationError):
            farmer_guide.FarmerGuideInput.model_validate(
                {
                    "language": "en",
                    "district": "salem",
                    "soil_choice": "black",
                    "water_choice": "low",
                    "weather_problem": "normal",
                    "farmer_goal": "safe",
                    "user_id": "another-user",
                }
            )


if __name__ == "__main__":
    unittest.main()
