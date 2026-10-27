export function getFrontendOrigin(env = (typeof import.meta !== "undefined" ? (import.meta.env ?? {}) : {})) {
  const configuredOrigin = (
    env.VITE_APP_ORIGIN
    || env.VITE_FRONTEND_URL
    || env.VITE_SITE_URL
    || ""
  ).trim();

  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "http://localhost:5173";
}

export function buildResetPasswordRedirectUrl(...inputs) {
  const origin = inputs.find((value) => typeof value === "string" && value.trim())
    || getFrontendOrigin(
      inputs.find((value) => value && typeof value === "object" && !Array.isArray(value)) || undefined,
    );
  const sanitizedOrigin = String(origin).trim().replace(/\/+$/, "");
  return `${sanitizedOrigin}/reset-password`;
}

export function getRecoveryLinkState(location) {
  if (!location) return { hasCode: false, hasRecoveryHash: false, hasRecoveryQuery: false, hasSessionToken: false };

  const search = new URLSearchParams(location.search || "");
  const hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const hasCode = Boolean(search.get("code"));
  const hasRecoveryQuery = search.get("type") === "recovery";
  const hasRecoveryHash = hash.get("type") === "recovery";
  const hasSessionToken = Boolean(hash.get("access_token") || hash.get("refresh_token"));

  return {
    hasCode,
    hasRecoveryQuery,
    hasRecoveryHash,
    hasSessionToken,
    code: search.get("code"),
    type: search.get("type") || hash.get("type"),
  };
}
