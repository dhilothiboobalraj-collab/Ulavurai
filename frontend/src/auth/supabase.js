import { createClient } from "@supabase/supabase-js";

const env = typeof import.meta !== "undefined" ? (import.meta.env ?? {}) : {};
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
  : null;

export function getSupabaseFrontendOrigin() {
  const env = typeof import.meta !== "undefined" ? (import.meta.env ?? {}) : {};
  const configuredOrigin = (
    env.VITE_APP_ORIGIN
    || env.VITE_FRONTEND_URL
    || env.VITE_SITE_URL
    || ""
  ).trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin.replace(/\/+$/, "")
    : "http://localhost:5173";
}

export function buildResetPasswordRedirectUrl() {
  return `${getSupabaseFrontendOrigin()}/reset-password`;
}

export async function getAccessToken() {
  if (!supabase) {
    throw new Error(
      "Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    await supabase.auth.signOut();
    throw error || new Error("Your session has expired. Please sign in again.");
  }
  return data.session.access_token;
}
