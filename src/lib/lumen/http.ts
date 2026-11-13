import "server-only";
import { getLumenConfig, lumenHeaders } from "./config";
import { LumenError, classifyLumenError } from "./errors";

export type LumenRequest = {
  method: "GET" | "POST";
  body?: BodyInit;
  headers?: Record<string, string>;
  timeoutMs: number;
};

export async function lumenFetch(url: string, init: LumenRequest): Promise<{ status: number; json: unknown }> {
  const { key, secret } = getLumenConfig();
  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: init.method,
      body: init.body,
      headers: { ...lumenHeaders(key, secret), ...init.headers },
      signal: AbortSignal.timeout(init.timeoutMs),
      cache: "no-store",
    });
    text = await res.text(); // the body read is covered by the same timeout signal
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) throw new LumenError("timeout");
    throw new LumenError("upstream");
  }
  let json: unknown;
  if (text) {
    try { json = JSON.parse(text); } catch { json = undefined; }
  }
  if (!res.ok) {
    const raw = (json as { error?: { code?: unknown } } | undefined)?.error?.code;
    const code = typeof raw === "string" ? raw : undefined;
    throw new LumenError(classifyLumenError(res.status, code), res.status, code);
  }
  return { status: res.status, json };
}
