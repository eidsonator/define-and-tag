import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkApiKey, createList, getList } from "./words-api";

const originalApiKey = process.env["WORDKEEPER_API_KEY"];
const originalOwnerId = process.env["WORDKEEPER_OWNER_ID"];

function request(headers?: HeadersInit, body?: unknown) {
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("https://example.test/api/lists", init);
}

describe("words API boundary", () => {
  beforeEach(() => {
    process.env["WORDKEEPER_API_KEY"] = "test-api-key";
    delete process.env["WORDKEEPER_OWNER_ID"];
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env["WORDKEEPER_API_KEY"];
    else process.env["WORDKEEPER_API_KEY"] = originalApiKey;
    if (originalOwnerId === undefined) delete process.env["WORDKEEPER_OWNER_ID"];
    else process.env["WORDKEEPER_OWNER_ID"] = originalOwnerId;
  });

  it("rejects missing and incorrect API keys", async () => {
    expect(checkApiKey(request())).toBeInstanceOf(Response);
    const missingKeyResponse = checkApiKey(request());
    const wrongKeyResponse = checkApiKey(request({ "x-api-key": "wrong" }));

    expect(await missingKeyResponse?.json()).toEqual({ error: "Unauthorized" });
    expect(await wrongKeyResponse?.json()).toEqual({ error: "Unauthorized" });
  });

  it("accepts both supported API-key header formats", () => {
    expect(checkApiKey(request({ "x-api-key": "test-api-key" }))).toBeNull();
    expect(checkApiKey(request({ authorization: "Bearer test-api-key" }))).toBeNull();
  });

  it("returns a server error rather than attempting database access when no key is configured", async () => {
    delete process.env["WORDKEEPER_API_KEY"];

    const response = checkApiKey(request({ "x-api-key": "test-api-key" }));
    expect(response?.status).toBe(500);
    expect(await response?.json()).toEqual({ error: "API key is not configured on the server" });
  });

  it("rejects invalid list input before contacting the database", async () => {
    const response = await createList(request({ "x-api-key": "test-api-key" }, { name: "  " }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/^Invalid input:/);
  });

  it("requires the owner configuration for otherwise valid mutations", async () => {
    const response = await createList(
      request({ "x-api-key": "test-api-key" }, { name: "Reading" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "WORDKEEPER_OWNER_ID is not configured on the server",
    });
  });

  it("validates identifiers before contacting the database", async () => {
    const response = await getList(request({ "x-api-key": "test-api-key" }), "not-a-uuid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid id" });
  });
});
