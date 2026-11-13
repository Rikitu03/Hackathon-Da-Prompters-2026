import { z } from "zod";
import { ApiError, json, sameOrigin } from "@/lib/api";
import { takeChatLimit } from "@/lib/chat-limit";
import { openSession, sendMessage } from "@/lib/lumen/chat";
import { LumenError, lumenErrorToHttp } from "@/lib/lumen/errors";
import { retrieveProductHelp, knowledgeVersion } from "@/lib/product-help/knowledge";
import { buildProductHelpPrompt, PRODUCT_HELP_NOTICE } from "@/lib/product-help/prompt";
import { renumberCitations } from "@/lib/rag/citations";

export const runtime = "nodejs";
export const maxDuration = 45;
const schema = z.object({ message: z.string().trim().min(1).max(500) }).strict();
const notice = () => json({ answer: PRODUCT_HELP_NOTICE, grounded: false, sources: [] });

async function readQuestion(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ApiError(415, "Expected application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A question is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new ApiError(413, "Question body is too large."); }
    chunks.push(value);
  }
  let payload: unknown;
  try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Invalid JSON."); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError(400, "Send only a question of 1–500 characters.");
  return parsed.data.message;
}

export async function POST(request: Request) {
  if (process.env.LUMEN_PRODUCT_HELP_ENABLED !== "true" || process.env.LUMEN_CHAT_ENABLED === "false") return json({ error: "Product help is unavailable right now." }, 503);
  if (!process.env.LUMEN_CHAT_URL || !process.env.LUMEN_CHAT_INSTANCE_ID || !process.env.LUMEN_API_KEY || !process.env.LUMEN_API_SECRET) return json({ error: "Product help is not configured." }, 503);
  try {
    sameOrigin(request);
    const question = await readQuestion(request);
    const { message, included } = buildProductHelpPrompt(question, retrieveProductHelp(question));
    if (!included.length) return notice();
    const limit = await takeChatLimit(request);
    if (!limit.allowed) {
      const response = json({ error: "Too many questions. Please wait a few minutes and try again." }, 429);
      response.headers.set("Retry-After", String(limit.retryAfterSec));
      return response;
    }
    const session = await openSession("gabay-product-help");
    const reply = await sendMessage(session, message);
    const cited = renumberCitations(reply.outOfScope ? "" : reply.answer, included);
    console.info("[product-help]", { version: knowledgeVersion.slice(0, 12), sent: included.length, cited: cited.sources.length, outOfScope: reply.outOfScope });
    return cited.sources.length ? json({ ...cited, grounded: true }) : notice();
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof LumenError) {
      const mapped = lumenErrorToHttp(error);
      return json({ error: mapped.message }, mapped.status);
    }
    console.error("[product-help] unexpected error", error instanceof Error ? error.name : "unknown");
    return json({ error: "Product help is temporarily unavailable. Please try again." }, 500);
  }
}
