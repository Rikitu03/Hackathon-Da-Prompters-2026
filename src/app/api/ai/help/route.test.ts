import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/lumen/chat", () => ({ openSession: vi.fn(), sendMessage: vi.fn() }));
vi.mock("@/lib/chat-limit", () => ({ takeChatLimit: vi.fn() }));
import { openSession, sendMessage } from "@/lib/lumen/chat";
import { takeChatLimit } from "@/lib/chat-limit";
import { ApiError } from "@/lib/api";
import { LumenError } from "@/lib/lumen/errors";
import { POST } from "./route";

beforeEach(() => {
  for (const [key, value] of Object.entries({ LUMEN_PRODUCT_HELP_ENABLED: "true", LUMEN_CHAT_ENABLED: "true", LUMEN_API_KEY: "test", LUMEN_API_SECRET: "test", LUMEN_CHAT_URL: "https://lumen.test", LUMEN_CHAT_INSTANCE_ID: "test" })) vi.stubEnv(key, value);
  vi.mocked(takeChatLimit).mockResolvedValue({ allowed: true, retryAfterSec: 0 });
  vi.mocked(openSession).mockResolvedValue("session-test");
  vi.mocked(sendMessage).mockResolvedValue({ answer: "Use My checklist [S1].", outOfScope: false, citations: [], degradedSources: [] });
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
const ask = (body: unknown = { message: "How do I save checklist progress?" }, headers = {}) => new Request("https://example.test/api/ai/help", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
it("answers from the product guide without a selected cycle or client history", async () => {
  const response = await POST(ask());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ grounded: true, answer: "Use My checklist [1].", sources: [{ sourceId: "product-help:checklist:1" }] });
  expect(openSession).toHaveBeenCalledWith("gabay-product-help");
  expect(vi.mocked(sendMessage).mock.calls[0][1]).toContain("=== SOURCES ===");
});
it.each([{}, { message: " " }, { message: "a".repeat(501) }, { message: "checklist", cycleId: "x" }, { message: "checklist", history: [] }, "{broken"]) ("rejects invalid input before spending credits", async body => {
  expect((await POST(ask(body))).status).toBe(400);
  expect(openSession).not.toHaveBeenCalled();
});
it("enforces the body cap using actual bytes rather than trusting content-length", async () => {
  expect((await POST(ask(" ".repeat(8193), { "content-length": "1" }))).status).toBe(413);
  expect(takeChatLimit).not.toHaveBeenCalled();
});
it("rejects cross-site requests", async () => {
  expect((await POST(ask(undefined, { origin: "https://hostile.test" }))).status).toBe(403);
  expect(openSession).not.toHaveBeenCalled();
});
it("is disabled unless explicitly enabled", async () => {
  vi.stubEnv("LUMEN_PRODUCT_HELP_ENABLED", "false");
  expect((await POST(ask())).status).toBe(503);
  expect(openSession).not.toHaveBeenCalled();
});
it("does not charge quota or call Lumen for unmatched questions", async () => {
  const response = await POST(ask({ message: "quantum astrophysics" }));
  expect(await response.json()).toMatchObject({ grounded: false, sources: [] });
  expect(takeChatLimit).not.toHaveBeenCalled();
  expect(openSession).not.toHaveBeenCalled();
});
it.each([{ answer: "Not covered.", outOfScope: true }, { answer: "Invented [S99].", outOfScope: false }, { answer: "Uncited text.", outOfScope: false }])("turns refusals and uncited replies into a notice", async reply => {
  vi.mocked(sendMessage).mockResolvedValue({ ...reply, citations: [], degradedSources: [] });
  expect(await (await POST(ask())).json()).toMatchObject({ grounded: false, sources: [] });
});
it("returns the shared quota retry interval without opening a session", async () => {
  vi.mocked(takeChatLimit).mockResolvedValue({ allowed: false, retryAfterSec: 90 });
  const response = await POST(ask());
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("90");
  expect(openSession).not.toHaveBeenCalled();
});
it("fails closed when shared storage is unavailable", async () => {
  vi.mocked(takeChatLimit).mockRejectedValue(new ApiError(503, "Unavailable"));
  expect((await POST(ask())).status).toBe(503);
  expect(openSession).not.toHaveBeenCalled();
});
it.each([["timeout", 504], ["auth", 502], ["bad_response", 502]] as const)("maps %s without fake answers", async (kind, status) => {
  vi.mocked(sendMessage).mockRejectedValue(new LumenError(kind));
  const response = await POST(ask());
  expect(response.status).toBe(status);
  expect(await response.json()).not.toHaveProperty("answer");
});
