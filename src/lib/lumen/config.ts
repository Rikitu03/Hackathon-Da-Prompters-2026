/** Server-only: never import into a client component. */
import "server-only";
import { LumenError } from "./errors";

export type LumenConfig = { key: string; secret: string; chatUrl?: string; ocrUrl?: string; chatInstanceId?: string };

export function getLumenConfig(): LumenConfig {
  const key = process.env.LUMEN_API_KEY;
  const secret = process.env.LUMEN_API_SECRET;
  if (!key || !secret) throw new LumenError("unconfigured");
  return {
    key,
    secret,
    chatUrl: process.env.LUMEN_CHAT_URL || undefined,
    ocrUrl: process.env.LUMEN_OCR_URL || undefined,
    chatInstanceId: process.env.LUMEN_CHAT_INSTANCE_ID || undefined,
  };
}

export function lumenHeaders(key: string, secret: string) {
  return { "lumen-api-key": key, "lumen-api-secret": secret };
}
