import { json, sameOrigin } from "@/lib/api"; // NextResponse.json + "Cache-Control: private, no-store"
import { openSession, sendMessage } from "@/lib/lumen/chat";
import { LumenError, lumenErrorToHttp } from "@/lib/lumen/errors";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { buildReviewPrompt, parseReviewAnswer } from "@/lib/verification/ai-prompt";
import { aiReviewRequestSchema, type AiReviewResponse } from "@/lib/verification/contract";

export const runtime = "nodejs";
export const maxDuration = 45; // open session (≤10 s) + message (≤28 s; Lumen gives up at 25 s)

// Best-effort, per server instance only. Each review that reaches Lumen costs about 7 API credits.
const verifyLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
const MAX_BODY_CHARS = 32_768;

const unavailable = (message: string): AiReviewResponse => ({ status: "unavailable", message });

export async function POST(request: Request) {
  if (process.env.LUMEN_CHAT_ENABLED === "false") return json({ error: "Lumen AI review is turned off right now." }, 503);
  if (!process.env.LUMEN_CHAT_URL || !process.env.LUMEN_CHAT_INSTANCE_ID || !process.env.LUMEN_API_KEY || !process.env.LUMEN_API_SECRET)
    return json({ error: "Lumen Chat integration not configured" }, 503);
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Cross-site requests are not allowed." }, 403);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_CHARS) return json({ error: "Request is too large." }, 413);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ error: "Could not read the request." }, 400);
  }
  if (text.length > MAX_BODY_CHARS) return json({ error: "Request is too large." }, 413);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = aiReviewRequestSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "Invalid review request." }, 400);
  const input = parsed.data;

  // Only requests that passed validation spend credits, so only they are counted.
  const limit = verifyLimiter.take(clientKey(request));
  if (!limit.ok) {
    const res = json({ error: "Too many reviews. Please wait a few minutes and try again." }, 429);
    res.headers.set("Retry-After", String(limit.retryAfterSec));
    return res;
  }

  try {
    // One fresh session per review: nothing is shared between students or stored on our side.
    const sessionId = await openSession(`gabay-verify-${input.profileId}`);
    const reply = await sendMessage(sessionId, buildReviewPrompt(input, new Date()));
    const flags = reply.outOfScope ? null : parseReviewAnswer(reply.answer, input.profileId);
    console.info("[verify]", { profile: input.profileId, outOfScope: reply.outOfScope, flags: flags?.length ?? null });
    if (reply.outOfScope) return json(unavailable("Lumen AI didn't review this document. The rule checks still apply."));
    if (!flags) return json(unavailable("Lumen AI's reply couldn't be read. The rule checks still apply."));
    return json({ status: "ok", flags } satisfies AiReviewResponse);
  } catch (err) {
    if (err instanceof LumenError) {
      console.warn("[verify] lumen error", { kind: err.kind, status: err.status, code: err.code });
      const { status, message } = lumenErrorToHttp(err);
      return json({ error: message }, status);
    }
    console.error("[verify] unexpected error", err instanceof Error ? err.name : "unknown");
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
