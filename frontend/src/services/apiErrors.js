const SOIL_LOOKUP_PATH = "/geospatial/soil-lookup";
const LOCATION_DATA_PATH = "/location-data";
const FARMER_RECOMMENDATIONS_PATH = "/farmer-guide/crop-recommendations";

export function getApiResponseError(path, status, body) {
  if (status === 404 && path === FARMER_RECOMMENDATIONS_PATH) {
    return "The connected backend does not have the Farmer Guide recommendations route. Deploy the current backend and frontend together, then try again.";
  }
  if (status === 404 && path === SOIL_LOOKUP_PATH) {
    return "The connected backend does not have the local soil lookup route. Restart or redeploy the backend, then try selecting the location again.";
  }
  if (status === 404 && path.startsWith(LOCATION_DATA_PATH)) {
    return "The connected backend does not have the location-data route. Restart or redeploy the backend, then try selecting the location again.";
  }

  const detail = body?.errors ?? body?.detail;
  const message = Array.isArray(detail)
    ? detail.map((item) => {
      const field = item.loc?.at(-1);
      return field && field !== "body" ? `${field}: ${item.msg}` : item.msg;
    }).join("; ")
    : detail;
  const summary = body?.message;
  return summary && message
    ? `${summary} ${message}`
    : summary || message || `Request failed (${status}).`;
}

export function getApiRequestError(path, reason) {
  if (reason?.name === "AbortError") {
    return new Error(
      path === SOIL_LOOKUP_PATH
        ? "The local soil lookup timed out. Check the backend connection and try selecting the location again."
        : path.startsWith(LOCATION_DATA_PATH)
          ? "The location lookup timed out. Check the backend connection and try again."
        : "The API request timed out. Please try again.",
    );
  }
  return new Error("Cannot reach the Ulavurai API. Check that the backend is running.");
}
