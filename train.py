"""Train and evaluate crop recommendation classifiers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

FEATURES = ("N", "P", "K", "temperature", "humidity", "ph", "rainfall")
TARGET = "label"
RANDOM_STATE = 42


def build_models() -> dict[str, Pipeline]:
    """Create comparable classifiers, scaling inputs where the algorithm needs it."""
    return {
        "Decision Tree": Pipeline(
            [("classifier", DecisionTreeClassifier(random_state=RANDOM_STATE))]
        ),
        "K-Nearest Neighbors": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("classifier", KNeighborsClassifier(n_neighbors=5)),
            ]
        ),
        "Neural Network": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    MLPClassifier(
                        hidden_layer_sizes=(128, 64),
                        max_iter=1000,
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "Random Forest": Pipeline(
            [
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=300,
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                )
            ]
        ),
        "Support Vector Machine": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    CalibratedClassifierCV(
                        estimator=SVC(random_state=RANDOM_STATE),
                        cv=3,
                        method="sigmoid",
                    ),
                ),
            ]
        ),
    }


def load_dataset(dataset_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    if not dataset_path.is_file():
        raise FileNotFoundError(
            f"Dataset not found at {dataset_path}. "
            "Place Crop_recommendation.csv in the datasets folder."
        )

    data = pd.read_csv(dataset_path)
    required_columns = [*FEATURES, TARGET]
    missing_columns = sorted(set(required_columns) - set(data.columns))
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")
    if data.empty:
        raise ValueError("Dataset contains no rows.")

    selected = data[required_columns].copy()
    if selected.isna().any().any():
        raise ValueError("Dataset contains missing values in required columns.")

    for feature in FEATURES:
        selected[feature] = pd.to_numeric(selected[feature], errors="raise")
    if not np.isfinite(selected[list(FEATURES)].to_numpy(dtype=float)).all():
        raise ValueError("Dataset contains non-finite feature values.")

    labels = selected[TARGET].astype(str).str.strip()
    if labels.eq("").any():
        raise ValueError("Dataset contains an empty crop label.")
    if labels.nunique() < 2:
        raise ValueError("At least two crop labels are required for classification.")
    return selected[list(FEATURES)], labels


def calculate_metrics(
    model: Pipeline, features: pd.DataFrame, labels: pd.Series
) -> dict[str, Any]:
    predictions = model.predict(features)
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision_macro": float(
            precision_score(labels, predictions, average="macro", zero_division=0)
        ),
        "recall_macro": float(
            recall_score(labels, predictions, average="macro", zero_division=0)
        ),
        "f1_macro": float(f1_score(labels, predictions, average="macro")),
    }


def train(dataset_path: Path, output_dir: Path) -> dict[str, Any]:
    features, labels = load_dataset(dataset_path)
    class_labels = sorted(labels.unique().tolist())
    indices = np.arange(len(labels))

    development_indices, test_indices = train_test_split(
        indices,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=labels,
    )
    train_indices, validation_indices = train_test_split(
        development_indices,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=labels.iloc[development_indices],
    )

    model_metrics: dict[str, dict[str, float]] = {}
    models = build_models()
    for name, model in models.items():
        model.fit(features.iloc[train_indices], labels.iloc[train_indices])
        model_metrics[name] = calculate_metrics(
            model, features.iloc[validation_indices], labels.iloc[validation_indices]
        )

    selected_name = max(
        model_metrics,
        key=lambda name: (
            model_metrics[name]["f1_macro"],
            model_metrics[name]["accuracy"],
        ),
    )
    selected_model = models[selected_name]
    selected_model.fit(features.iloc[development_indices], labels.iloc[development_indices])

    test_features = features.iloc[test_indices]
    test_labels = labels.iloc[test_indices]
    predictions = selected_model.predict(test_features)
    test_metrics = calculate_metrics(selected_model, test_features, test_labels)

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "crop_recommendation.joblib"
    joblib.dump(
        {
            "model": selected_model,
            "features": list(FEATURES),
            "labels": class_labels,
            "selected_model": selected_name,
        },
        model_path,
    )

    metrics = {
        "dataset": dataset_path.name,
        "rows": int(len(labels)),
        "crop_classes": class_labels,
        "split": {
            "training_percent": 60,
            "validation_percent": 20,
            "test_percent": 20,
            "random_state": RANDOM_STATE,
        },
        "selection_metric": "validation macro F1, with accuracy as tie-breaker",
        "validation_metrics": model_metrics,
        "selected_model": selected_name,
        "test_metrics": test_metrics,
        "test_classification_report": classification_report(
            test_labels,
            predictions,
            labels=class_labels,
            output_dict=True,
            zero_division=0,
        ),
    }
    (output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    matrix = confusion_matrix(test_labels, predictions, labels=class_labels)
    pd.DataFrame(matrix, index=class_labels, columns=class_labels).to_csv(
        output_dir / "confusion_matrix.csv", index_label="actual\\predicted"
    )

    print(f"Selected model: {selected_name}")
    print(f"Test accuracy: {test_metrics['accuracy']:.4f}")
    print(f"Test macro F1: {test_metrics['f1_macro']:.4f}")
    print(f"Saved model: {model_path}")
    print(f"Saved metrics and confusion matrix in: {output_dir}")
    return metrics


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=project_dir / "datasets" / "Crop_recommendation.csv",
        help="Path to the crop recommendation CSV.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=project_dir / "models",
        help="Directory for the trained model and evaluation reports.",
    )
    args = parser.parse_args()
    train(args.dataset, args.output_dir)


if __name__ == "__main__":
    main()
