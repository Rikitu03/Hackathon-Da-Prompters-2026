import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { APPLICANT_COOKIE, encodeGuestCookie, newGuestToken } from "@/lib/applicant/session-security";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAnonymousClient: () => ({ rpc }), createServerSupabaseClient: vi.fn() }));
import { POST, DELETE } from "./route";
const secret = "c".repeat(64);
beforeEach(() => {
  vi.stubEnv("APPLICANT_SESSION_SECRET", secret); vi.stubEnv("VERCEL", ""); rpc.mockReset();
  rpc.mockImplementation(async (_name, args) => ({ data: { id: args.p_id, expiresAt: new Date(Date.now()+86400000).toISOString() }, error: null }));
});
afterEach(() => vi.unstubAllEnvs());
describe("minimal applicant metadata endpoint", () => {
  it("requires no Auth account, emits an HttpOnly cookie, and sends only signed metadata to Supabase", async () => {
    const response = await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["expiresAt", "sessionId"]);
    const cookie = response.cookies.get(APPLICANT_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(rpc.mock.calls[0][1].p_ip_hash).toBeNull();
    expect(Object.keys(rpc.mock.calls[0][1]).sort()).toEqual(["p_forget","p_id","p_ip_hash","p_issued_at","p_proof","p_token_hash"]);
  });
  it("rejects personal fields and cross-site requests before database access", async () => {
    expect((await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST", body: JSON.stringify({ fullName: "Do not store" }) }))).status).toBe(400);
    expect((await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST", headers: { origin: "https://other.test" } }))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("accepts an empty POST body stream as sent by Next's HTTP adapter", async () => {
    const response = await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST", body: "" }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
  });
  it("reuses a signed cookie and discards forged identifiers", async () => {
    const value = newGuestToken();
    await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST", headers: { cookie: `${APPLICANT_COOKIE}=${encodeGuestCookie(value, secret)}` } }));
    expect(rpc.mock.calls[0][1].p_id).toBe(value.id);
    await POST(new NextRequest("http://localhost/api/applicant/session", { method: "POST", headers: { cookie: `${APPLICANT_COOKIE}=${value.id}.forged` } }));
    expect(rpc.mock.calls[1][1].p_id).not.toBe(value.id);
  });
  it("forgets only the caller's signed reference and clears the cookie", async () => {
    const value = newGuestToken();
    const response = await DELETE(new NextRequest("http://localhost/api/applicant/session", { method: "DELETE", headers: { cookie: `${APPLICANT_COOKIE}=${encodeGuestCookie(value, secret)}` } }));
    expect(response.status).toBe(200);
    expect(rpc.mock.calls[0][1].p_id).toBe(value.id);
    expect(rpc.mock.calls[0][1].p_forget).toBe(true);
    expect(response.cookies.get(APPLICANT_COOKIE)?.maxAge).toBe(0);
  });
});
