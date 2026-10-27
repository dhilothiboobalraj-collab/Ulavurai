import { getAccessToken, supabase } from "../auth/supabase.js";
import { resolveApiBaseUrl } from "./apiBase.js";
import { getApiRequestError, getApiResponseError } from "./apiErrors.js";
import {
  validateGeospatialLookupResponse,
  validateLocalGeospatialResponse,
  validateLocationDataResponse,
} from "./geospatialAutofill.js";
import { validateFarmerCropRecommendationsResponse } from "./farmerCropRecommendations.js";

const API_BASE = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.PROD,
);

async function request(path, options = {}) {
  let response;
  const { timeoutMs, ...fetchOptions } = options;
  const isHealthCheck = path === "/health";
  const token = isHealthCheck ? null : await getAccessToken();
  const abortController = timeoutMs ? new AbortController() : null;
  const timeout = timeoutMs
    ? setTimeout(() => abortController.abort(), timeoutMs)
    : null;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      ...(abortController ? { signal: abortController.signal } : {}),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (reason) {
    throw getApiRequestError(path, reason);
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (response.status === 401 && !isHealthCheck && supabase) {
    await supabase.auth.signOut();
    if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
      window.location.assign("/login");
    }
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getApiResponseError(path, response.status, body));
  }
  return body;
}

export const api = {
  health: () => request("/health"),
  metrics: () => request("/model/metrics"),
  features: () => request("/model/features"),
  cropCalendar: () => request("/model/crop-calendar"),
  importance: () => request("/model/importance"),
  crops: () => request("/crops"),
  preview: (values) =>
    request("/predict/preview", { method: "POST", body: JSON.stringify(values) }),
  predict: (values) =>
    request("/predict", { method: "POST", body: JSON.stringify(values) }),
  farmerPredict: (values) =>
    request("/farmer-guide/predict", { method: "POST", body: JSON.stringify(values) }),
  farmerCropRecommendations: (values, language = "en") =>
    request("/farmer-guide/crop-recommendations", {
      method: "POST",
      body: JSON.stringify(values),
    }).then((response) => validateFarmerCropRecommendationsResponse(response, language)),
  farmerLocationEstimate: (latitude, longitude) => {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    return request(`/farmer-guide/location-estimate?${query}`);
  },
  geospatialSoilLookup: (latitude, longitude) =>
    request("/geospatial/soil-lookup", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
      timeoutMs: 15000,
    }).then(validateGeospatialLookupResponse),
  geospatialLocalLookup: (latitude, longitude) =>
    request("/geospatial/local-lookup", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
      timeoutMs: 25000,
    }).then(validateLocalGeospatialResponse),
  locationData: (latitude, longitude) => {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    return request(`/location-data?${query}`, { timeoutMs: 20000 })
      .then(validateLocationDataResponse);
  },
  history: () => request("/history"),
  clearHistory: () => request("/history", { method: "DELETE" }),
};
