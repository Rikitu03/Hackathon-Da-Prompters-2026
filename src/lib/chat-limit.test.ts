import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createAnonymousClient: vi.fn() }));
import { createAnonymousClient } from "@/lib/supabase/server";
import { chatLimitProof, takeChatLimit } from "./chat-limit";
const secret = "a".repeat(64);
const rpc = vi.fn();
beforeEach(() => {
  vi.stubEnv("APPLICANT_SESSION_SECRET", secret);
  vi.stubEnv("VERCEL", "1");
  vi.mocked(createAnonymousClient).mockReturnValue({ rpc } as unknown as ReturnType<typeof createAnonymousClient>);
  rpc.mockResolvedValue({ data: { allowed: true, retryAfterSec: 0 }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
const request = (ip = "203.0.113.8") => new Request("https://example.test/api/ai/help", { headers: { "x-vercel-forwarded-for": ip } });
it("signs a domain-separated proof and never sends raw addresses", () => {
  const proof = chatLimitProof(request(), secret, new Date("2026-11-13T12:00:00Z"));
  expect(proof.p_proof).toBe(createHmac("sha256", secret).update(`chat-limit|${proof.p_bucket}|${proof.p_issued_at}`).digest("hex"));
  expect(JSON.stringify(proof)).not.toContain("203.0.113.8");
});
it("ignores forged forwarding headers on untrusted hosts and uses one fallback bucket", () => {
  vi.stubEnv("VERCEL", "0");
  expect(chatLimitProof(request("1.2.3.4"), secret).p_bucket).toBe(chatLimitProof(request("8.8.8.8"), secret).p_bucket);
});
it("uses shared RPC state across separate stateless callers", async () => {
  let count = 0;
  rpc.mockImplementation(async () => ({ data: { allowed: ++count <= 10, retryAfterSec: count > 10 ? 120 : 0 }, error: null }));
  const replies = await Promise.all(Array.from({ length: 12 }, () => takeChatLimit(request())));
  expect(replies.filter(r => r.allowed)).toHaveLength(10);
  expect(replies.filter(r => !r.allowed)).toHaveLength(2);
  expect(createAnonymousClient).toHaveBeenCalledTimes(12);
  expect(rpc.mock.calls.every(([name]) => name === "take_gabay_chat_limit")).toBe(true);
});
it.each([{ data: null, error: { code: "42501" } }, { data: { allowed: true }, error: null }, { data: { allowed: false, retryAfterSec: 0 }, error: null }])("fails closed on missing or invalid database results", async result => {
  rpc.mockResolvedValue(result);
  await expect(takeChatLimit(request())).rejects.toMatchObject({ status: 503 });
});
it("fails closed without the existing signing secret", async () => {
  vi.stubEnv("APPLICANT_SESSION_SECRET", "");
  await expect(takeChatLimit(request())).rejects.toMatchObject({ status: 503 });
  expect(rpc).not.toHaveBeenCalled();
});
