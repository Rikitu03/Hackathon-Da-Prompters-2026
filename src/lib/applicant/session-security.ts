import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const APPLICANT_COOKIE = "gabay-applicant-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type GuestToken = { id: string; token: string };
const hmac = (secret: string, value: string) => createHmac("sha256", secret).update(value).digest("hex");
export function newGuestToken(): GuestToken { return { id: randomUUID(), token: randomBytes(32).toString("hex") }; }
export function encodeGuestCookie(value: GuestToken, secret: string) {
  const payload = `${value.id}.${value.token}`;
  return `${payload}.${hmac(secret, `cookie|${payload}`)}`;
}
export function decodeGuestCookie(value: string | undefined, secret: string): GuestToken | null {
  if (!value) return null;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})\.([0-9a-f]{64})$/.exec(value);
  if (!match) return null;
  const expected = hmac(secret, `cookie|${match[1]}.${match[2]}`);
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(expected, "hex")) ? { id: match[1], token: match[2] } : null;
}
export function trustedIpHash(request: Request, secret: string, trustedVercel: boolean, now = new Date()): string | null {
  // Arbitrary client-supplied forwarding headers are ignored on local/custom hosts.
  if (!trustedVercel) return null;
  const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (!address || !isIP(address)) return null;
  return hmac(secret, `ip|${now.toISOString().slice(0,10)}|${address}`);
}
export function sessionProof(value: GuestToken, ipHash: string | null, forget: boolean, secret: string, issuedAt = Math.floor(Date.now()/1000)) {
  const tokenHash = createHash("sha256").update(value.token).digest("hex");
  return { p_id: value.id, p_token_hash: tokenHash, p_ip_hash: ipHash, p_issued_at: issuedAt, p_forget: forget,
    p_proof: hmac(secret, `${value.id}|${tokenHash}|${ipHash ?? "-"}|${issuedAt}|${forget ? "1" : "0"}`) };
}
