export function resolveApiBaseUrl(configuredBase, isProduction) {
  const configured = typeof configuredBase === "string"
    ? configuredBase.trim()
    : "";

  if (isProduction) {
    if (configured && configured !== "/api") {
      throw new Error(
        "Production uses the backend deployed with this frontend. Set VITE_API_BASE_URL to /api or leave it unset.",
      );
    }
    return "/api";
  }

  return configured || "http://localhost:8000";
}
