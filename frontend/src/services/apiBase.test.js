import assert from "node:assert/strict";
import test from "node:test";

import { resolveApiBaseUrl } from "./apiBase.js";

test("production defaults to the same-origin Vercel API route", () => {
  assert.equal(resolveApiBaseUrl(undefined, true), "/api");
});

test("production accepts an explicit same-origin API base", () => {
  assert.equal(resolveApiBaseUrl(" /api ", true), "/api");
});

test("production rejects API URLs that bypass the backend deployed with the frontend", () => {
  assert.throws(
    () => resolveApiBaseUrl("/backend", true),
    /Production uses the backend deployed with this frontend/,
  );
  assert.throws(
    () => resolveApiBaseUrl("https://old-api.example.com", true),
    /Production uses the backend deployed with this frontend/,
  );
});

test("development keeps the local FastAPI default", () => {
  assert.equal(
    resolveApiBaseUrl(undefined, false),
    "http://localhost:8000",
  );
});
