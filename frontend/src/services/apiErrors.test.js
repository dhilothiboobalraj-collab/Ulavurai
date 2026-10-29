import assert from "node:assert/strict";
import test from "node:test";
import {
  getApiRequestError,
  getApiResponseError,
} from "./apiErrors.js";

const SOIL_LOOKUP_PATH = "/geospatial/soil-lookup";
const FARMER_RECOMMENDATIONS_PATH = "/farmer-guide/crop-recommendations";

test("API error messages distinguish auth, permissions, missing routes, and backend failures", () => {
  assert.equal(
    getApiResponseError(SOIL_LOOKUP_PATH, 401, { detail: "Invalid or expired access token." }),
    "Invalid or expired access token.",
  );
  assert.equal(
    getApiResponseError(SOIL_LOOKUP_PATH, 403, { detail: "Access is forbidden." }),
    "Access is forbidden.",
  );
  assert.match(
    getApiResponseError(SOIL_LOOKUP_PATH, 404, {}),
    /does not have the local soil lookup route/,
  );
  assert.match(
    getApiResponseError(FARMER_RECOMMENDATIONS_PATH, 404, {}),
    /does not have the Farmer Guide recommendations route/,
  );
  assert.equal(
    getApiResponseError("/health", 404, {}),
    "Request failed (404).",
  );
  assert.equal(
    getApiResponseError(SOIL_LOOKUP_PATH, 503, { detail: "Local dataset unavailable." }),
    "Local dataset unavailable.",
  );
  assert.equal(
    getApiResponseError(SOIL_LOOKUP_PATH, 422, {
      detail: [{ loc: ["body", "latitude"], msg: "Input should be less than or equal to 90" }],
    }),
    "latitude: Input should be less than or equal to 90",
  );
});

test("network failures and timeouts have distinct actionable messages", () => {
  assert.match(
    getApiRequestError(SOIL_LOOKUP_PATH, new TypeError("Failed to fetch")).message,
    /Cannot reach the Ulavurai API/,
  );
  assert.match(
    getApiRequestError(SOIL_LOOKUP_PATH, { name: "AbortError" }).message,
    /soil lookup timed out/,
  );
});
