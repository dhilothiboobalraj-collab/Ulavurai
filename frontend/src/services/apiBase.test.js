import assert from "node:assert/strict";
import test from "node:test";

import { resolveApiBaseUrl } from "./apiBase.js";

test("production defaults to the same-origin Vercel API route", () => {
  assert.equal(resolveApiBaseUrl(undefined, true), "/api");
});

test("production accepts an explicit same-origin API base", () => {
  assert.equal(resolveApiBaseUrl(" /api ", true), "/api");
});

test("production accepts an absolute HTTPS API URL", () => {
  assert.equal(
    resolveApiBaseUrl("https://api.example.com", true),
    "https://api.example.com",
  );
});

test("production rejects other relative API paths", () => {
  assert.throws(
    () => resolveApiBaseUrl("/backend", true),
    /must be \/api or an absolute HTTPS API URL/,
  );
});

test("production rejects insecure and local absolute API URLs", () => {
  assert.throws(
    () => resolveApiBaseUrl("http://api.example.com", true),
    /must be \/api or point to a public HTTPS backend/,
  );
  assert.throws(
    () => resolveApiBaseUrl("https://localhost:8000", true),
    /must be \/api or point to a public HTTPS backend/,
  );
});

test("development keeps the local FastAPI default", () => {
  assert.equal(
    resolveApiBaseUrl(undefined, false),
    "http://localhost:8000",
  );
});
