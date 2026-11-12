export type LumenErrorKind =
  | "unconfigured" | "auth" | "credits" | "rate_limited" | "timeout"
  | "unavailable" | "not_found" | "bad_request" | "bad_response" | "upstream";

export class LumenError extends Error {
  readonly kind: LumenErrorKind;
  readonly status?: number;
  readonly code?: string;
  constructor(kind: LumenErrorKind, status?: number, code?: string) {
    super(`Lumen ${kind}${status ? ` (${status}${code ? ` ${code}` : ""})` : ""}`);
    this.name = "LumenError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function classifyLumenError(status: number, code?: string): LumenErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return code === "API_CREDITS_INSUFFICIENT" || code === "LC_INSUFFICIENT" ? "credits" : "auth";
  if (status === 429) return "rate_limited";
  if (status === 504) return "timeout";
  if (status === 503) return "unavailable";
  if (status === 404) return "not_found";
  if (status === 400 || status === 409 || status === 413 || status === 415 || status === 428) return "bad_request";
  return "upstream";
}

/** Client-safe status + message. Never includes Lumen codes or credentials. */
export function lumenErrorToHttp(err: LumenError): { status: number; message: string } {
  switch (err.kind) {
    case "unconfigured":
      return { status: 503, message: "AI service is not configured." };
    case "credits":
    case "unavailable":
      return { status: 503, message: "AI service is temporarily unavailable. Please try again later." };
    case "rate_limited":
      return { status: 429, message: "Too many requests. Please wait a moment and try again." };
    case "timeout":
      return { status: 504, message: "The AI service took too long. Please try again." };
    case "bad_request":
      return { status: 500, message: "Something went wrong preparing your request." };
    default:
      return { status: 502, message: "AI service unavailable." };
  }
}
