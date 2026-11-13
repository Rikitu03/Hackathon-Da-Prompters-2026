import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { trustedIpHash } from "@/lib/applicant/session-security";
import { createAnonymousClient } from "@/lib/supabase/server";

const resultSchema = z.object({ allowed: z.boolean(), retryAfterSec: z.number().int().min(0).max(600) });
export function chatLimitProof(request: Request, secret: string, now = new Date()) {
  const bucket = trustedIpHash(request, secret, process.env.VERCEL === "1", now)
    ?? createHmac("sha256", secret).update("chat-limit|local-or-untrusted").digest("hex");
  const issuedAt = Math.floor(now.getTime() / 1000);
  return { p_bucket: bucket, p_issued_at: issuedAt, p_proof: createHmac("sha256", secret).update(`chat-limit|${bucket}|${issuedAt}`).digest("hex") };
}

/** Stateless callers share an atomic database quota across both chat routes. */
export async function takeChatLimit(request: Request) {
  const secret = process.env.APPLICANT_SESSION_SECRET;
  if (!secret || !/^[0-9a-f]{64}$/.test(secret)) throw new ApiError(503, "Chat is temporarily unavailable. Please try again later.");
  try {
    const { data, error } = await createAnonymousClient().rpc("take_gabay_chat_limit", chatLimitProof(request, secret));
    const result = resultSchema.safeParse(data);
    if (error || !result.success || (!result.data.allowed && result.data.retryAfterSec < 1)) throw new Error("Limiter unavailable");
    return result.data;
  } catch {
    throw new ApiError(503, "Chat is temporarily unavailable. Please try again later.");
  }
}
