import { getAccessToken, supabase } from "../auth/supabase.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim()
  || (import.meta.env.PROD ? "/api" : "http://localhost:8000");

async function request(path, options = {}) {
  let response;
  const isHealthCheck = path === "/health";
  if (import.meta.env.PROD && !API_BASE.startsWith("/")) {
    let backendUrl;
    try {
      backendUrl = new URL(API_BASE);
    } catch {
      throw new Error("VITE_API_BASE_URL must be an absolute HTTPS URL in production.");
    }
    if (
      backendUrl.protocol !== "https:"
      || ["localhost", "127.0.0.1", "::1"].includes(backendUrl.hostname)
    ) {
      throw new Error("VITE_API_BASE_URL must point to a public HTTPS backend in production.");
    }
  }
  const token = isHealthCheck ? null : await getAccessToken();
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the SeasonSense API. Check that the backend is running.");
  }

  if (response.status === 401 && !isHealthCheck && supabase) {
    await supabase.auth.signOut();
    if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
      window.location.assign("/login");
    }
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => {
        const field = item.loc?.at(-1);
        return field && field !== "body" ? `${field}: ${item.msg}` : item.msg;
      }).join("; ")
      : detail;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return body;
}

export const api = {
  health: () => request("/health"),
  metrics: () => request("/model/metrics"),
  features: () => request("/model/features"),
  importance: () => request("/model/importance"),
  crops: () => request("/crops"),
  predict: (values) =>
    request("/predict", { method: "POST", body: JSON.stringify(values) }),
  farmerPredict: (values) =>
    request("/farmer-guide/predict", { method: "POST", body: JSON.stringify(values) }),
  history: () => request("/history"),
  clearHistory: () => request("/history", { method: "DELETE" }),
};
