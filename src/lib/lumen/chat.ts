import "server-only";
import { z } from "zod";
import { getLumenConfig } from "./config";
import { LumenError } from "./errors";
import { lumenFetch } from "./http";
import { LUMEN_MESSAGE_MAX } from "./limits";

/** Fixed reply the PLP-Hackathon-Blank instance returns when its scope gate refuses a message. */
export const OUT_OF_SCOPE_REPLY = "That question is outside what this assistant covers.";

export type LumenChatAnswer = { answer: string; outOfScope: boolean; citations: string[]; degradedSources: string[] };

const SessionSchema = z.object({ Session: z.object({ id: z.string().min(1) }) });
const AnswerSchema = z.object({
  Answer: z.object({
    answer: z.string(),
    citations: z.array(z.string()).optional(),
    degradedSources: z.array(z.string()).optional(),
  }),
});

function instanceBase(): string {
  const { chatUrl, chatInstanceId } = getLumenConfig();
  if (!chatUrl || !chatInstanceId) throw new LumenError("unconfigured");
  return `${chatUrl.replace(/\/+$/, "")}/instances/${encodeURIComponent(chatInstanceId)}`;
}

/** Returns only the id: the raw session echoes our API key in metadata.admin, so it must never leave this function. */
export async function openSession(title: string): Promise<string> {
  const { json } = await lumenFetch(`${instanceBase()}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: title.slice(0, 200) }),
    timeoutMs: 10_000,
  });
  const parsed = SessionSchema.safeParse(json);
  if (!parsed.success) throw new LumenError("bad_response");
  return parsed.data.Session.id;
}

export async function sendMessage(sessionId: string, message: string): Promise<LumenChatAnswer> {
  if (message.length < 1 || message.length > LUMEN_MESSAGE_MAX) throw new LumenError("bad_request");
  const { json } = await lumenFetch(`${instanceBase()}/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
    timeoutMs: 28_000, // Lumen ends a turn at 25 s with 504 AI_CHAT_REPLY_TIMEOUT
  });
  const parsed = AnswerSchema.safeParse(json);
  if (!parsed.success) throw new LumenError("bad_response");
  const { answer, citations = [], degradedSources = [] } = parsed.data.Answer;
  return { answer, outOfScope: answer.trim().startsWith(OUT_OF_SCOPE_REPLY), citations, degradedSources };
}
