import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/lumen/chat", () => ({
  OUT_OF_SCOPE_REPLY: "That question is outside what this assistant covers.",
  openSession: vi.fn(),
  sendMessage: vi.fn(),
}));

import { openSession, sendMessage } from "@/lib/lumen/chat";
import { LumenError, lumenErrorToHttp } from "@/lib/lumen/errors";
import type { AiReviewRequest } from "@/lib/verification/contract";
import { POST } from "./route";

const REQ: AiReviewRequest = {
  consent: true,
  profileId: "certificate_of_registration",
  fields: [{ key: "school_year", label: "School year", value: "2026-2027" }],
  rawText: "CERTIFICATE OF REGISTRATION",
  related: [],
};
let ip = 0;
const verify = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/ai/verify", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}`, ...headers },
  });
const reply = (answer: string, outOfScope = false) =>
  vi.mocked(sendMessage).mockResolvedValue({ answer, outOfScope, citations: [], degradedSources: [] });

beforeEach(() => {
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
  vi.stubEnv("LUMEN_CHAT_URL", "https://lumen.test/ai_chat");
  vi.stubEnv("LUMEN_CHAT_INSTANCE_ID", "instance-1");
  vi.mocked(openSession).mockResolvedValue("session-1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/ai/verify", () => {
  it("is off when chat is disabled", async () => {
    vi.stubEnv("LUMEN_CHAT_ENABLED", "false");
    expect((await POST(verify(REQ))).status).toBe(503);
    expect(openSession).not.toHaveBeenCalled();
  });

  it("is unavailable when Lumen chat is not configured", async () => {
    vi.stubEnv("LUMEN_CHAT_URL", "");
    expect((await POST(verify(REQ))).status).toBe(503);
  });

  it("blocks cross-site requests", async () => {
    expect((await POST(verify(REQ, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(openSession).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...REQ, consent: false }],
    [{ ...REQ, profileId: "x" }],
    [{ ...REQ, fields: Array(13).fill(REQ.fields[0]) }],
    ["not json"],
  ])("rejects invalid input %#", async (body) => {
    expect((await POST(verify(body))).status).toBe(400);
    expect(openSession).not.toHaveBeenCalled();
  });

  it("rejects large bodies before parsing", async () => {
    expect((await POST(verify({ ...REQ, rawText: "x".repeat(40_000) }))).status).toBe(413);
    expect(openSession).not.toHaveBeenCalled();
  });

  it("returns parsed AI flags", async () => {
    reply('{"flags":[{"field":"school_year","severity":"info","title":"t","detail":"d"}]}');
    const res = await POST(verify(REQ));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      flags: [{ id: "ai-1", severity: "info", origin: "ai", fieldKeys: ["school_year"], title: "t", detail: "d" }],
    });
    expect(openSession).toHaveBeenCalledWith("gabay-verify-certificate_of_registration");
    const message = vi.mocked(sendMessage).mock.calls[0][1];
    expect(message).toContain("[S1] Certificate of Registration");
  });

  it("reports a scope-gated reply as unavailable", async () => {
    reply("That question is outside what this assistant covers.", true);
    expect(await (await POST(verify(REQ))).json()).toMatchObject({ status: "unavailable", message: expect.stringContaining("rule checks") });
  });

  it("reports unreadable replies as unavailable", async () => {
    reply("no json here");
    expect(await (await POST(verify(REQ))).json()).toMatchObject({ status: "unavailable", message: expect.stringContaining("couldn't be read") });
  });

  it("maps Lumen errors", async () => {
    const err = new LumenError("timeout");
    vi.mocked(openSession).mockRejectedValue(err);
    const res = await POST(verify(REQ));
    expect(res.status).toBe(lumenErrorToHttp(err).status);
  });

  it("rate limits one client after ten reviews", async () => {
    reply('{"flags":[]}');
    const headers = { "x-forwarded-for": "10.9.9.9" };
    for (let i = 0; i < 10; i++) expect((await POST(verify(REQ, headers))).status).toBe(200);
    const res = await POST(verify(REQ, headers));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
