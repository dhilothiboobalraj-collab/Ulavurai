export function resolveApiBaseUrl(configuredBase, isProduction) {
  const configured = typeof configuredBase === "string"
    ? configuredBase.trim()
    : "";
  const apiBase = configured || (isProduction ? "/api" : "http://localhost:8000");

  if (!isProduction || apiBase === "/api") {
    return apiBase;
  }

  let backendUrl;
  try {
    backendUrl = new URL(apiBase);
  } catch {
    throw new Error("VITE_API_BASE_URL must be /api or an absolute HTTPS API URL in production.");
  }

  if (
    backendUrl.protocol !== "https:"
    || ["localhost", "127.0.0.1", "::1"].includes(backendUrl.hostname)
  ) {
    throw new Error("VITE_API_BASE_URL must be /api or point to a public HTTPS backend in production.");
  }

  return apiBase;
}
