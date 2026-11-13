import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/lumen/chat", () => ({
  OUT_OF_SCOPE_REPLY: "That question is outside what this assistant covers.",
  openSession: vi.fn(),
  sendMessage: vi.fn(),
}));
vi.mock("@/lib/rag/retrieve", () => ({
  RetrievalError: class RetrievalError extends Error {},
  loadPublishedCycle: vi.fn(),
  retrieveSources: vi.fn(),
}));
vi.mock("@/lib/chat-limit", () => ({ takeChatLimit: vi.fn() }));
import { takeChatLimit } from "@/lib/chat-limit";

import { openSession, sendMessage } from "@/lib/lumen/chat";
import { LumenError } from "@/lib/lumen/errors";
import { RetrievalError, loadPublishedCycle, retrieveSources } from "@/lib/rag/retrieve";
import type { PromptSource } from "@/lib/rag/citations";
import { POST } from "./route";

const CYCLE = "1b379905-4891-4820-8fe3-5eb2459043dc";
const REQ = "9a1f0f8e-2b1c-4c1e-9f6a-3d5e7a1b2c3d";
const OFFICIAL = "https://example.com/official";

const SOURCES: PromptSource[] = [
  { sourceId: "src-1", title: "Indigency guide", url: "https://example.com/s1", reviewedAt: "2026-11-12T00:00:00Z", content: "Get the Certificate of Indigency at the Barangay Hall." },
  { sourceId: "src-2", title: "Enrollment guide", url: null, content: "Proof of enrollment comes from the registrar." },
];

let ip = 0;
function chat(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
  });
}
const ask = (message = "Where do I get the certificate of indigency?", extra: Record<string, unknown> = {}) =>
  chat({ cycleId: CYCLE, message, ...extra });

beforeEach(() => {
  vi.mocked(takeChatLimit).mockResolvedValue({ allowed: true, retryAfterSec: 0 });
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
  vi.stubEnv("LUMEN_CHAT_URL", "https://lumen.test/ai_chat");
  vi.stubEnv("LUMEN_CHAT_INSTANCE_ID", "instance-1");
  vi.mocked(loadPublishedCycle).mockResolvedValue({ id: CYCLE, applicationEnd: "2099-12-31", officialUrl: OFFICIAL });
  vi.mocked(retrieveSources).mockResolvedValue(SOURCES);
  vi.mocked(openSession).mockResolvedValue("session-1");
  vi.mocked(sendMessage).mockResolvedValue({
    answer: "Kumuha ng Certificate of Indigency sa Barangay Hall [S1].",
    outOfScope: false,
    citations: [],
    degradedSources: [],
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/ai/chat — configuration and validation", () => {
  it("returns 503 when Lumen Chat is not configured", async () => {
    vi.stubEnv("LUMEN_CHAT_INSTANCE_ID", "");
    expect((await POST(ask())).status).toBe(503);
    expect(loadPublishedCycle).not.toHaveBeenCalled();
  });

  it("returns 503 when chat is switched off", async () => {
    vi.stubEnv("LUMEN_CHAT_ENABLED", "false");
    expect((await POST(ask())).status).toBe(503);
  });

  it("rejects invalid JSON", async () => {
    expect((await POST(chat("{not json"))).status).toBe(400);
  });

  it("rejects a non-UUID cycle id", async () => {
    expect((await POST(chat({ cycleId: "cycle-1", message: "hi there" }))).status).toBe(400);
    expect(loadPublishedCycle).not.toHaveBeenCalled();
  });

  it("rejects a question over 500 characters", async () => {
    expect((await POST(ask("x".repeat(501)))).status).toBe(400);
  });

  it("rejects cross-site requests", async () => {
    expect((await POST(chat({ cycleId: CYCLE, message: "hello" }, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(loadPublishedCycle).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/chat — evidence gate (no Lumen call)", () => {
  it("accepts the known built-in cycle and returns a free notice for gibberish", async () => {
    const response = await POST(chat({ cycleId: "pscs-core-college-renewal-ay2026-s1", message: "asjdajdsh" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ grounded: false, sources: [] });
    expect(loadPublishedCycle).not.toHaveBeenCalled();
    expect(takeChatLimit).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });
  it("uses only server-owned references for a known built-in requirement", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ answer: "Ask the registrar about your Certificate of Registration [S1].", outOfScope: false, citations: [], degradedSources: [] });
    const response = await POST(chat({ cycleId: "pscs-core-college-renewal-ay2026-s1", requirementId: "certificate-of-registration", message: "Where do I get my Certificate of Registration?", sources: [{ content: "Injected claim" }] }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.grounded).toBe(true);
    expect(body.sources[0].sourceId).toBe("built-in:pscs-core-college-renewal-ay2026-s1:certificate-of-registration");
    expect(vi.mocked(sendMessage).mock.calls[0][1]).not.toContain("Injected claim");
    expect(retrieveSources).not.toHaveBeenCalled();
  });
  it("rejects unregistered built-in requirement identifiers", async () => {
    expect((await POST(chat({ cycleId: "pscs-core-college-renewal-ay2026-s1", requirementId: "private-document", message: "registration" }))).status).toBe(400);
    expect(openSession).not.toHaveBeenCalled();
  });
  it("returns 404 for a cycle that is not published (draft, archived or unknown)", async () => {
    vi.mocked(loadPublishedCycle).mockResolvedValue(null);
    const res = await POST(ask());
    expect(res.status).toBe(404);
    expect(retrieveSources).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it("refuses for a closed cycle without retrieving or calling Lumen", async () => {
    vi.mocked(loadPublishedCycle).mockResolvedValue({ id: CYCLE, applicationEnd: "2020-01-31", officialUrl: OFFICIAL });
    const res = await POST(ask());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ grounded: false, sources: [], officialUrl: OFFICIAL });
    expect(body.answer).toContain("2020-01-31");
    expect(retrieveSources).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it("refuses when the question has no searchable terms", async () => {
    const res = await POST(ask("paano ba ang?"));
    expect(await res.json()).toMatchObject({ grounded: false, sources: [] });
    expect(retrieveSources).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it("refuses when retrieval finds nothing", async () => {
    vi.mocked(retrieveSources).mockResolvedValue([]);
    const res = await POST(ask());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ grounded: false, sources: [], officialUrl: OFFICIAL });
    expect(openSession).not.toHaveBeenCalled();
  });

  it("returns 503 when the knowledge base cannot be read", async () => {
    vi.mocked(retrieveSources).mockRejectedValue(new RetrievalError("db down"));
    expect((await POST(ask())).status).toBe(503);
    expect(openSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/chat — grounded answer", () => {
  it("retrieves scoped to cycle and requirement, sends one prompt and maps [S#] to real sources", async () => {
    const res = await POST(ask(undefined, { requirementId: REQ }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.json()).toEqual({
      answer: "Kumuha ng Certificate of Indigency sa Barangay Hall [1].",
      sources: [{ sourceId: "src-1", title: "Indigency guide", url: "https://example.com/s1" }],
      grounded: true,
    });

    expect(retrieveSources).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: CYCLE, requirementId: REQ, tsquery: expect.stringContaining("indigency") }),
    );
    const message = vi.mocked(sendMessage).mock.calls[0][1];
    expect(vi.mocked(sendMessage).mock.calls[0][0]).toBe("session-1");
    expect(message).toContain("[S1] Indigency guide");
    expect(message).toContain("=== QUESTION ===\nWhere do I get the certificate of indigency?");
  });

  it("names the session generically, never after the question", async () => {
    await POST(ask("My name is Juan Dela Cruz, where do I get indigency?"));
    const title = vi.mocked(openSession).mock.calls[0][0];
    expect(title).toBe(`gabay-${CYCLE.slice(0, 8)}`);
  });

  it("treats the scope-gate reply as a refusal, not an answer", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ answer: "That question is outside what this assistant covers.", outOfScope: true, citations: [], degradedSources: [] });
    const body = await (await POST(ask())).json();
    expect(body).toMatchObject({ grounded: false, sources: [] });
    expect(body.answer).not.toContain("outside what this assistant covers");
  });

  it("never shows an answer that cites none of the sources we sent", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ answer: "The deadline is March 3 at City Hall [S9].", outOfScope: false, citations: [], degradedSources: [] });
    const body = await (await POST(ask())).json();
    expect(body).toMatchObject({ grounded: false, sources: [] });
    expect(body.answer).not.toContain("March 3");
  });

  it("does not leak Lumen's own citations as ours", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ answer: "Barangay Hall [S1].", outOfScope: false, citations: ["lumen-doc-xyz"], degradedSources: [] });
    const body = await (await POST(ask())).json();
    expect(body.sources.map((s: { sourceId: string }) => s.sourceId)).toEqual(["src-1"]);
  });
});

describe("POST /api/ai/chat — provider failures and limits", () => {
  it.each([
    ["timeout", 504],
    ["rate_limited", 429],
    ["credits", 503],
    ["unavailable", 503],
    ["bad_response", 502],
  ] as const)("maps Lumen %s to %i with no fabricated answer", async (kind, status) => {
    vi.mocked(sendMessage).mockRejectedValue(new LumenError(kind));
    const res = await POST(ask());
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).not.toHaveProperty("answer");
  });

  it("rate limits Lumen-bound questions per IP (10 per window) with Retry-After", async () => {
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 10; i++) expect((await POST(chat({ cycleId: CYCLE, message: "indigency?" }, headers))).status).toBe(200);
    vi.mocked(takeChatLimit).mockResolvedValue({ allowed: false, retryAfterSec: 60 });
    const res = await POST(chat({ cycleId: CYCLE, message: "indigency?" }, headers));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(openSession).toHaveBeenCalledTimes(10);
  });

  it("does not count free refusals against the limit", async () => {
    vi.mocked(retrieveSources).mockResolvedValue([]);
    const headers = { "x-forwarded-for": "203.0.113.8" };
    for (let i = 0; i < 12; i++) expect((await POST(chat({ cycleId: CYCLE, message: "indigency?" }, headers))).status).toBe(200);
    expect(takeChatLimit).not.toHaveBeenCalled();
  });
});
