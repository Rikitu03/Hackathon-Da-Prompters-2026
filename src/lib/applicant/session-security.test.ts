import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { decodeGuestCookie, encodeGuestCookie, newGuestToken, sessionProof, trustedIpHash } from "./session-security";
const secret = "a".repeat(64);
describe("account-free browser token boundary", () => {
  it("issues unpredictable references and verifies signed cookies", () => {
    const first = newGuestToken(), second = newGuestToken();
    expect(first.id).not.toBe(second.id);
    expect(first.token).not.toBe(second.token);
    expect(first.token).toHaveLength(64);
    const cookie = encodeGuestCookie(first, secret);
    expect(decodeGuestCookie(cookie, secret)).toEqual(first);
    expect(decodeGuestCookie(cookie, "b".repeat(64))).toBeNull();
    expect(decodeGuestCookie(cookie.replace(first.id, second.id), secret)).toBeNull();
    expect(decodeGuestCookie("invented", secret)).toBeNull();
  });
  it("binds the database proof to the token, IP metadata, operation and timestamp", () => {
    const value = newGuestToken();
    const proof = sessionProof(value, null, false, secret, 123);
    expect(proof.p_token_hash).toBe(createHash("sha256").update(value.token).digest("hex"));
    expect(proof.p_token_hash).not.toBe(value.token);
    expect(proof.p_proof).not.toBe(sessionProof(value, null, true, secret, 123).p_proof);
    expect(proof.p_proof).not.toBe(sessionProof(value, null, false, secret, 124).p_proof);
  });
  it("ignores untrusted IP headers and rotates trusted IP hashes each UTC day", () => {
    const request = new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.1", "x-vercel-forwarded-for": "203.0.113.1" } });
    expect(trustedIpHash(request, secret, false)).toBeNull();
    const day1 = trustedIpHash(request, secret, true, new Date("2026-11-13T01:00:00Z"));
    expect(day1).toMatch(/^[0-9a-f]{64}$/);
    expect(day1).not.toContain("203.0.113.1");
    expect(day1).not.toBe(trustedIpHash(request, secret, true, new Date("2026-11-14T01:00:00Z")));
    expect(trustedIpHash(new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "invalid" } }), secret, true)).toBeNull();
  });
});
