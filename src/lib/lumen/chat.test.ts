import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OUT_OF_SCOPE_REPLY, openSession, sendMessage } from "./chat";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
  vi.stubEnv("LUMEN_CHAT_URL", "https://lumen.test/ai_chat/");
  vi.stubEnv("LUMEN_CHAT_INSTANCE_ID", "inst-1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("openSession", () => {
  it("posts to the instance and returns only the session id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(201, { Session: { id: "sess-1", organizationID: "org", metadata: { admin: "test-key" } } }),
    );
    await expect(openSession("gabay-test")).resolves.toBe("sess-1");
    expect(fetchSpy.mock.calls[0][0]).toBe("https://lumen.test/ai_chat/instances/inst-1/sessions");
    expect(JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body))).toEqual({ title: "gabay-test" });
  });

  it("fails as unconfigured without an instance id", async () => {
    vi.stubEnv("LUMEN_CHAT_INSTANCE_ID", "");
    await expect(openSession("x")).rejects.toMatchObject({ kind: "unconfigured" });
  });

  it("rejects an unexpected response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(201, { nope: true }));
    await expect(openSession("x")).rejects.toMatchObject({ kind: "bad_response" });
  });
});

describe("sendMessage", () => {
  it("returns the answer with citations defaulted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, { Answer: { sessionID: "sess-1", answer: "Sa Barangay Hall [S2]." } }),
    );
    await expect(sendMessage("sess-1", "Saan?")).resolves.toEqual({
      answer: "Sa Barangay Hall [S2].", outOfScope: false, citations: [], degradedSources: [],
    });
    expect(fetchSpy.mock.calls[0][0]).toBe("https://lumen.test/ai_chat/instances/inst-1/sessions/sess-1/messages");
  });

  it("flags the instance's fixed out-of-scope reply", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, { Answer: { sessionID: "s", answer: OUT_OF_SCOPE_REPLY, citations: [], degradedSources: [] } }),
    );
    await expect(sendMessage("s", "Reply with OK")).resolves.toMatchObject({ outOfScope: true });
  });

  it("refuses messages over 4000 chars without calling Lumen", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendMessage("s", "x".repeat(4001))).rejects.toMatchObject({ kind: "bad_request" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
