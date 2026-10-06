from __future__ import annotations

from typing import Any

from schema import DISPLAY_NAMES


def build_explanation(
    crop: str,
    values: dict[str, float],
    feature_importance: list[dict[str, Any]],
    analyses: list[dict[str, Any]],
) -> dict[str, Any]:
    leading_features = feature_importance[:3]
    if leading_features:
        analysis_by_feature = {item["feature"]: item for item in analyses}
        signal_details = []
        for item in leading_features:
            feature = item["feature"]
            analysis = analysis_by_feature.get(feature)
            detail = f"{DISPLAY_NAMES[feature]} ({values[feature]:.2f}"
            if analysis:
                detail += f", {analysis['level'].lower()} relative to training data"
            signal_details.append(f"{detail})")
        summary = (
            f"The saved Random Forest ranked {crop} highest for the input "
            "conditions shown. Its three highest global feature-importance "
            "signals among those inputs are "
            + ", ".join(signal_details)
            + ". Importance describes the fitted model overall; it does not "
            "prove that these inputs caused this individual prediction."
        )
    else:
        summary = f"The saved model ranked {crop} highest for the input conditions shown. Feature importance is unavailable, so no feature-level explanation is presented."
    return {
        "summary": summary,
        "input_values": [
            {
                "feature": feature,
                "name": DISPLAY_NAMES[feature],
                "value": values[feature],
            }
            for feature in values
        ],
    }
