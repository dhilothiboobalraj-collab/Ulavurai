import assert from "node:assert/strict";
import test from "node:test";
import { validatePredictionResponse } from "./predictionResponse.js";

const validResponse = {
  success: true,
  best_crop: "rice",
  recommendations: [
    { rank: 1, crop: "rice", confidence: 80 },
    { rank: 2, crop: "maize", confidence: 15 },
  ],
};

test("accepts a complete crop recommendation response", () => {
  assert.equal(validatePredictionResponse(validResponse), validResponse);
});

test("rejects a successful response without a recommendation", () => {
  assert.throws(
    () => validatePredictionResponse({ success: true }),
    /response was incomplete/,
  );
});

test("rejects a response whose top crop conflicts with best_crop", () => {
  assert.throws(
    () => validatePredictionResponse({
      ...validResponse,
      recommendations: [{ ...validResponse.recommendations[0], crop: "maize" }],
    }),
    /response was incomplete/,
  );
});

test("rejects invalid model confidence values", () => {
  assert.throws(
    () => validatePredictionResponse({
      ...validResponse,
      recommendations: [{ ...validResponse.recommendations[0], confidence: 101 }],
    }),
    /response was incomplete/,
  );
});
