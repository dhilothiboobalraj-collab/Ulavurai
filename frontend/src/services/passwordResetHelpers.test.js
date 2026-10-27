import test from "node:test";
import assert from "node:assert/strict";

import {
  buildResetPasswordRedirectUrl,
  getFrontendOrigin,
  getRecoveryLinkState,
} from "./passwordResetHelpers.js";

test("buildResetPasswordRedirectUrl uses configured origin when present", () => {
  assert.equal(
    buildResetPasswordRedirectUrl({ VITE_APP_ORIGIN: "https://app.example.com/" }),
    "https://app.example.com/reset-password",
  );
});

test("buildResetPasswordRedirectUrl falls back to current origin in browser", () => {
  const original = globalThis.window;
  globalThis.window = { location: { origin: "http://localhost:5173/" } };

  try {
    assert.equal(buildResetPasswordRedirectUrl(), "http://localhost:5173/reset-password");
    assert.equal(getFrontendOrigin(), "http://localhost:5173");
  } finally {
    if (original === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = original;
    }
  }
});

test("recovery link helpers detect code and hash flows without exposing values", () => {
  const state = getRecoveryLinkState({
    search: "?code=abc123&type=recovery",
    hash: "#access_token=secret&refresh_token=refresh&type=recovery",
  });

  assert.equal(state.hasCode, true);
  assert.equal(state.hasRecoveryQuery, true);
  assert.equal(state.hasRecoveryHash, true);
  assert.equal(state.hasSessionToken, true);
  assert.equal(state.code, "abc123");
  assert.equal(state.type, "recovery");
});
