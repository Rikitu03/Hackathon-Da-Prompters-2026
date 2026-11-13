import { type NextRequest } from "next/server";
import { ApiError, endpoint, json, sameOrigin } from "@/lib/api";
import { createAnonymousClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { APPLICANT_COOKIE, decodeGuestCookie, encodeGuestCookie, newGuestToken, SESSION_SECONDS, sessionProof, trustedIpHash } from "@/lib/applicant/session-security";
export const runtime = "nodejs";
const bootstrapLimit = createRateLimiter({ limit: 120, windowMs: 10 * 60 * 1000 });

function config() {
  const secret = process.env.APPLICANT_SESSION_SECRET;
  if (!secret || !/^[0-9a-f]{64}$/.test(secret)) throw new ApiError(503, "Browser references are unavailable. You can still browse guides and save a local draft.");
  return secret;
}
async function databaseRequest(value: ReturnType<typeof newGuestToken>, ipHash: string | null, forget: boolean, secret: string) {
  const { data, error } = await createAnonymousClient().rpc("applicant_session_request", sessionProof(value, ipHash, forget, secret));
  if (error) throw new ApiError(503, "Browser references are temporarily unavailable. Your local drafts are unaffected.");
  return data as { id?: string; expiresAt?: string; expired?: boolean; forgotten?: boolean };
}
export async function POST(request: NextRequest) {
  return endpoint(async () => {
    sameOrigin(request);
    // There is deliberately no body schema for personal information or drafts.
    if (request.body) {
      // Next exposes a stream even for an empty POST. Read at most the first
      // nonempty chunk, then reject without buffering personal information.
      const reader = request.body.getReader();
      let chunk = await reader.read();
      while (!chunk.done && !chunk.value.length) chunk = await reader.read();
      if (!chunk.done) { await reader.cancel(); throw new ApiError(400, "This endpoint accepts no applicant fields or request body"); }
    }
    const secret = config();
    let value = decodeGuestCookie(request.cookies.get(APPLICANT_COOKIE)?.value, secret) ?? newGuestToken();
    const ipHash = trustedIpHash(request, secret, process.env.VERCEL === "1");
    if (!bootstrapLimit.take(ipHash ?? "local-or-untrusted-proxy").ok) throw new ApiError(429, "Too many browser reference requests. Try again later; local drafts still work.");
    let result = await databaseRequest(value, ipHash, false, secret);
    if (result.expired) { value = newGuestToken(); result = await databaseRequest(value, ipHash, false, secret); }
    if (!result.id || !result.expiresAt) throw new ApiError(503, "Could not create the browser reference");
    const response = json({ sessionId: result.id, expiresAt: result.expiresAt });
    const remaining = Math.max(0, Math.min(SESSION_SECONDS, Math.floor((Date.parse(result.expiresAt)-Date.now())/1000)));
    response.cookies.set(APPLICANT_COOKIE, encodeGuestCookie(value, secret), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: remaining,
    });
    return response;
  });
}
export async function DELETE(request: NextRequest) {
  return endpoint(async () => {
    sameOrigin(request);
    const secret = config();
    const value = decodeGuestCookie(request.cookies.get(APPLICANT_COOKIE)?.value, secret);
    if (value) await databaseRequest(value, null, true, secret);
    const response = json({ forgotten: true });
    response.cookies.set(APPLICANT_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  });
}
