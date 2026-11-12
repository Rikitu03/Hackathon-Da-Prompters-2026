import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lumenFetch } from "./http";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );

beforeEach(() => {
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("lumenFetch", () => {
  it("sends both auth headers and returns parsed JSON", async () => {
    const fetchSpy = respond(200, { ok: 1 });
    const res = await lumenFetch("https://lumen.test/x", { method: "GET", timeoutMs: 1000 });
    expect(res).toEqual({ status: 200, json: { ok: 1 } });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "lumen-api-key": "test-key", "lumen-api-secret": "test-secret" });
  });

  it("throws a classified LumenError with the Lumen error code", async () => {
    respond(403, { error: { code: "API_CREDITS_INSUFFICIENT", message: "no credits" } });
    await expect(lumenFetch("https://lumen.test/x", { method: "GET", timeoutMs: 1000 })).rejects.toMatchObject({
      name: "LumenError", kind: "credits", status: 403, code: "API_CREDITS_INSUFFICIENT",
    });
  });

  it("handles non-JSON error bodies", async () => {
    respond(502, "<html>bad gateway</html>");
    await expect(lumenFetch("https://lumen.test/x", { method: "GET", timeoutMs: 1000 })).rejects.toMatchObject({
      kind: "upstream", status: 502,
    });
  });

  it("maps an aborted request to a timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));
    await expect(lumenFetch("https://lumen.test/x", { method: "GET", timeoutMs: 1 })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("refuses to call Lumen without credentials", async () => {
    vi.stubEnv("LUMEN_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(lumenFetch("https://lumen.test/x", { method: "GET", timeoutMs: 1000 })).rejects.toMatchObject({ kind: "unconfigured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
