function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validatePredictionResponse(response) {
  const recommendations = response?.recommendations;
  const validRecommendations = Array.isArray(recommendations)
    && recommendations.length > 0
    && recommendations.every((recommendation) => (
      isRecord(recommendation)
      && Number.isInteger(recommendation.rank)
      && recommendation.rank > 0
      && typeof recommendation.crop === "string"
      && recommendation.crop.trim().length > 0
      && typeof recommendation.confidence === "number"
      && Number.isFinite(recommendation.confidence)
      && recommendation.confidence >= 0
      && recommendation.confidence <= 100
    ));

  if (
    !isRecord(response)
    || response.success !== true
    || typeof response.best_crop !== "string"
    || response.best_crop.trim().length === 0
    || !validRecommendations
    || recommendations[0].crop !== response.best_crop
  ) {
    throw new Error(
      "The recommendation response was incomplete, so no crop was displayed. Please retry; if it continues, check the backend logs.",
    );
  }

  return response;
}
