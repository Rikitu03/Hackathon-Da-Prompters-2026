import { z } from "zod";
import { json, sameOrigin } from "@/lib/api"; // NextResponse.json + "Cache-Control: private, no-store"
import { openSession, sendMessage } from "@/lib/lumen/chat";
import { LumenError, lumenErrorToHttp } from "@/lib/lumen/errors";
import { mapCitations } from "@/lib/rag/citations";
import { closedCycleAnswer, isCycleClosed, noEvidenceAnswer } from "@/lib/rag/fallback";
import { MAX_QUESTION_CHARS, buildPrompt } from "@/lib/rag/prompt";
import { buildTsQuery } from "@/lib/rag/query";
import { RetrievalError, loadPublishedCycle, retrieveSources } from "@/lib/rag/retrieve";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import type { ChatResponse } from "@/types/domain";

export const runtime = "nodejs";
export const maxDuration = 45; // open session (≤10 s) + message (≤28 s; Lumen gives up at 25 s)

// Best-effort, per server instance only. Counts only questions that reach Lumen (7 credits each).
const chatLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const Schema = z.object({
  cycleId: z.string().uuid(),
  requirementId: z.string().uuid().optional(),
  // ≤ 500 so the question can never crowd the sources out of Lumen's 4000-byte message.
  message: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
});

export async function POST(request: Request) {
  if (process.env.LUMEN_CHAT_ENABLED === "false") return json({ error: "The assistant is turned off right now." }, 503);
  if (!process.env.LUMEN_CHAT_URL || !process.env.LUMEN_CHAT_INSTANCE_ID || !process.env.LUMEN_API_KEY || !process.env.LUMEN_API_SECRET)
    return json({ error: "Lumen Chat integration not configured" }, 503);
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Cross-site requests are not allowed." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = Schema.safeParse(payload);
  if (!parsed.success) return json({ error: `Invalid question: ask about one cycle in at most ${MAX_QUESTION_CHARS} characters.` }, 400);
  const { cycleId, requirementId, message } = parsed.data;
  const log = { cycle: cycleId.slice(0, 8), requirement: !!requirementId };

  try {
    // 1. Scope: the cycle must be publicly visible and still open.
    const cycle = await loadPublishedCycle(cycleId);
    if (!cycle) return json({ error: "This scholarship guide is not published." }, 404);
    if (isCycleClosed(cycle.applicationEnd)) return json(closedCycleAnswer(cycle.applicationEnd!, cycle.officialUrl));

    // 2. Evidence gate: no searchable terms or no approved passages means no Lumen call.
    const tsquery = buildTsQuery(message);
    const sources = tsquery ? await retrieveSources({ cycleId, requirementId, tsquery }) : [];
    const { message: prompt, included } = buildPrompt(message, sources);
    if (included.length === 0) {
      console.info("[chat] no evidence", { ...log, terms: !!tsquery, retrieved: sources.length });
      return json(noEvidenceAnswer(cycle.officialUrl));
    }

    // 3. Generate. Only this path spends credits, so only it is rate limited.
    const limit = chatLimiter.take(clientKey(request));
    if (!limit.ok) {
      const res = json({ error: "Too many questions. Please wait a few minutes and try again." }, 429);
      res.headers.set("Retry-After", String(limit.retryAfterSec));
      return res;
    }
    // One fresh session per question: isolated between students, nothing stored on our side.
    const sessionId = await openSession(`gabay-${cycleId.slice(0, 8)}`);
    const reply = await sendMessage(sessionId, prompt);

    // 4. Cite only sources we sent. An uncited or scope-gated reply is replaced by the fixed refusal.
    const cited = reply.outOfScope ? [] : mapCitations(reply.answer, included);
    console.info("[chat] answered", { ...log, sent: included.length, cited: cited.length, outOfScope: reply.outOfScope, lumenCitations: reply.citations.length });
    if (cited.length === 0) return json(noEvidenceAnswer(cycle.officialUrl));
    const body: ChatResponse = { answer: reply.answer.trim(), sources: cited, grounded: true };
    return json(body);
  } catch (err) {
    if (err instanceof LumenError) {
      console.warn("[chat] lumen error", { ...log, kind: err.kind, status: err.status, code: err.code });
      const { status, message: text } = lumenErrorToHttp(err);
      return json({ error: text }, status);
    }
    if (err instanceof RetrievalError) {
      console.warn("[chat] retrieval error", { ...log, code: err.code });
      return json({ error: "Could not load the scholarship guidance. Please try again." }, 503);
    }
    console.error("[chat] unexpected error", err instanceof Error ? err.name : "unknown");
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
