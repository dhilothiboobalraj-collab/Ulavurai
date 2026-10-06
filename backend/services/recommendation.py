from __future__ import annotations

from typing import Any

from backend.services.predictor import get_predictor


class RecommendationService:
    """Shared entry point for every interface that has trained-model inputs."""

    def recommend(self, model_inputs: dict[str, float]) -> dict[str, Any]:
        return get_predictor().predict(model_inputs)


recommendation_service = RecommendationService()
