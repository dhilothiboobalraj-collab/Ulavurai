const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? "/api" : "http://localhost:8000");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the SeasonSense API. Check that the backend is running.");
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
  farmerRecommend: (values) =>
    request("/farmer-guide/recommend", {
      method: "POST",
      body: JSON.stringify(values),
    }),
  farmerPredict: (values) =>
    request("/farmer-guide/predict", { method: "POST", body: JSON.stringify(values) }),
  history: () => request("/history"),
  clearHistory: () => request("/history", { method: "DELETE" }),
};
