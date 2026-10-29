export async function readApiResponseBody(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
    if (response.ok) {
      throw new Error(
        "The Ulavurai API returned a web page instead of JSON. Check the API URL or development proxy, then restart the frontend.",
      );
    }
    return {};
  }

  try {
    return await response.json();
  } catch {
    throw new Error("The Ulavurai API returned invalid JSON. Please retry.");
  }
}
