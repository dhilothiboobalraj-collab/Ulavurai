from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from services.explanation import build_explanation
from schema import (
    DISPLAY_NAMES,
    ENVIRONMENT_FEATURES,
    FEATURES,
    SOIL_FEATURES,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "crop_recommendation.joblib"
METRICS_PATH = PROJECT_ROOT / "models" / "metrics.json"
DATASET_PATH = PROJECT_ROOT / "datasets" / "Crop_recommendation.csv"


class PredictorError(RuntimeError):
    """Raised when the saved model bundle or its required data cannot be used."""


class CropPredictor:
    def __init__(self) -> None:
        self.model: Any = None
        self.metrics: dict[str, Any] = {}
        self.dataset: pd.DataFrame | None = None
        self.feature_importance: list[dict[str, Any]] = []
        self.feature_metadata: list[dict[str, Any]] = []
        self.crops: list[str] = []
        self.selected_model = ""

    def load(self) -> None:
        for path, description in (
            (MODEL_PATH, "Trained model"),
            (METRICS_PATH, "Model metrics"),
            (DATASET_PATH, "Training dataset"),
        ):
            if not path.is_file():
                raise PredictorError(f"{description} file is missing: {path}")

        try:
            bundle = joblib.load(MODEL_PATH)
        except (
            OSError,
            ValueError,
            EOFError,
            pickle.UnpicklingError,
            ModuleNotFoundError,
            ImportError,
            AttributeError,
        ) as exc:
            raise PredictorError(f"Could not load trained model {MODEL_PATH}: {exc}") from exc
        if not isinstance(bundle, dict) or "model" not in bundle:
            raise PredictorError(
                f"Saved model bundle {MODEL_PATH} does not contain a model."
            )

        artifact_features = bundle.get("features")
        if list(artifact_features or []) != list(FEATURES):
            raise PredictorError(
                "Saved model input features do not match train.py's required "
                f"names and order: {artifact_features!r}"
            )

        try:
            metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
            dataset = pd.read_csv(DATASET_PATH)
        except (OSError, json.JSONDecodeError, pd.errors.ParserError) as exc:
            raise PredictorError(f"Could not read model metadata or dataset: {exc}") from exc
        missing = [feature for feature in (*FEATURES, "label") if feature not in dataset]
        if missing:
            raise PredictorError(f"Training dataset is missing columns: {missing}")
        if dataset.empty:
            raise PredictorError(f"Training dataset is empty: {DATASET_PATH}")

        model = bundle["model"]
        estimator = model
        if hasattr(model, "named_steps"):
            steps = list(model.named_steps.values())
            if steps:
                estimator = steps[-1]
        if not hasattr(model, "predict") or not hasattr(model, "predict_proba"):
            raise PredictorError(
                f"Saved model {MODEL_PATH} must support predict and predict_proba."
            )

        importance_values = getattr(estimator, "feature_importances_", None)
        importance: list[dict[str, Any]] = []
        if importance_values is not None:
            if len(importance_values) != len(FEATURES):
                raise PredictorError(
                    "Saved model feature importance does not match its input features."
                )
            importance = sorted(
                [
                    {
                        "feature": feature,
                        "name": DISPLAY_NAMES[feature],
                        "importance": float(value),
                    }
                    for feature, value in zip(FEATURES, importance_values, strict=True)
                ],
                key=lambda item: item["importance"],
                reverse=True,
            )

        metadata = []
        for feature in FEATURES:
            series = pd.to_numeric(dataset[feature], errors="coerce")
            if series.isna().any() or not np.isfinite(series.to_numpy()).all():
                raise PredictorError(
                    f"Training dataset feature {feature!r} has invalid numeric values."
                )
            metadata.append(
                {
                    "name": feature,
                    "label": DISPLAY_NAMES[feature],
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "q25": float(series.quantile(0.25)),
                    "median": float(series.median()),
                    "q75": float(series.quantile(0.75)),
                }
            )

        self.model = model
        self.metrics = metrics
        self.dataset = dataset
        self.feature_importance = importance
        self.feature_metadata = metadata
        self.crops = sorted(str(item) for item in bundle.get("labels", []))
        self.selected_model = str(bundle.get("selected_model", ""))

    def predict(self, values: dict[str, float]) -> dict[str, Any]:
        if self.model is None or self.dataset is None:
            raise PredictorError("The trained model is not loaded.")
        try:
            input_frame = pd.DataFrame(
                [[values[feature] for feature in FEATURES]], columns=FEATURES
            )
            probabilities = self.model.predict_proba(input_frame)[0]
            classes = list(self.model.classes_)
            ranked = np.argsort(probabilities)[::-1][:3]
            recommendations = [
                {
                    "rank": rank,
                    "crop": str(classes[index]),
                    "confidence": float(probabilities[index] * 100),
                }
                for rank, index in enumerate(ranked, start=1)
            ]
            best_crop = recommendations[0]["crop"]
            soil_analysis = self._analysis(values, SOIL_FEATURES)
            environment_analysis = self._analysis(values, ENVIRONMENT_FEATURES)
            analyses = soil_analysis + environment_analysis
            return {
                "best_crop": best_crop,
                "recommendations": recommendations,
                "explanation": build_explanation(
                    best_crop, values, self.feature_importance, analyses
                ),
                "soil_analysis": soil_analysis,
                "environment_analysis": environment_analysis,
                "warnings": self._range_warnings(values),
            }
        except (KeyError, TypeError, ValueError, IndexError) as exc:
            raise PredictorError(f"Prediction failed: {exc}") from exc

    def _analysis(
        self, values: dict[str, float], features: tuple[str, ...]
    ) -> list[dict[str, Any]]:
        assert self.dataset is not None
        results = []
        for feature in features:
            series = self.dataset[feature]
            value = values[feature]
            q25 = float(series.quantile(0.25))
            q75 = float(series.quantile(0.75))
            level = "Low" if value < q25 else "High" if value > q75 else "Moderate"
            results.append(
                {
                    "feature": feature,
                    "name": DISPLAY_NAMES[feature],
                    "value": value,
                    "level": level,
                    "basis": "Relative to the training dataset",
                    "q25": q25,
                    "q75": q75,
                }
            )
        return results

    def _range_warnings(self, values: dict[str, float]) -> list[str]:
        assert self.dataset is not None
        warnings = []
        for feature in FEATURES:
            series = self.dataset[feature]
            value = values[feature]
            minimum, maximum = float(series.min()), float(series.max())
            if value < minimum or value > maximum:
                warnings.append(
                    f"{DISPLAY_NAMES[feature]}: this value is outside the range "
                    f"observed in the training dataset ({minimum:.2f}-{maximum:.2f}). "
                    "Prediction may be less reliable."
                )
        return warnings


_predictor = CropPredictor()
_load_error: str | None = None


def load_predictor() -> None:
    global _load_error
    try:
        _predictor.load()
        _load_error = None
    except PredictorError as exc:
        _load_error = str(exc)


def get_predictor() -> CropPredictor:
    if _load_error:
        raise PredictorError(_load_error)
    if _predictor.model is None:
        load_predictor()
    if _load_error:
        raise PredictorError(_load_error)
    return _predictor


def predictor_status() -> dict[str, Any]:
    try:
        get_predictor()
    except PredictorError as exc:
        return {"status": "not_ready", "model_loaded": False, "error": str(exc)}
    return {"status": "ok", "model_loaded": True}
