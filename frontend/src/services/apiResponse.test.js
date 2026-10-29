import assert from "node:assert/strict";
import test from "node:test";
import { readApiResponseBody } from "./apiResponse.js";

test("parses a JSON API response", async () => {
  const response = new Response(JSON.stringify({ success: true }), {
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readApiResponseBody(response), { success: true });
});

test("rejects successful HTML responses instead of treating them as empty JSON", async () => {
  const response = new Response("<!doctype html>", {
    headers: { "content-type": "text/html" },
  });
  await assert.rejects(
    readApiResponseBody(response),
    /returned a web page instead of JSON/,
  );
});

test("returns an empty body for non-JSON error responses", async () => {
  const response = new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain" },
  });
  assert.deepEqual(await readApiResponseBody(response), {});
});

test("rejects malformed JSON responses", async () => {
  const response = new Response("{", {
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(
    readApiResponseBody(response),
    /returned invalid JSON/,
  );
});
