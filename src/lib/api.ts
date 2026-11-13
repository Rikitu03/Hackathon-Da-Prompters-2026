import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
export async function endpoint(action: () => Promise<NextResponse>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return json({ error: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }, 400);
    console.error("Backend request failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The database service is unavailable. Please try again." }, 503);
  }
}
export function databaseError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new ApiError(403, "Publisher access required");
  if (error.code === "P0002" || error.code === "PGRST116") throw new ApiError(404, "Record not found");
  if (error.code === "22023") throw new ApiError(400, error.message);
  if (error.code?.startsWith("23") || error.code?.startsWith("22")) throw new ApiError(400, "Invalid data or related record. Check your input.");
  throw new Error(error.message);
}
export async function body<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  // Limit the bytes actually read; Content-Length alone is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "JSON body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512_000) { await reader.cancel(); throw new ApiError(413, "Request body is too large"); }
    chunks.push(value);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Invalid JSON"); }
  return schema.parse(parsed);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  // Browser fetch metadata is independent of a reverse proxy's rewritten Host.
  // Same-site is intentionally rejected for state-changing admin endpoints.
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    throw new ApiError(403, "Cross-site writes are not allowed");
  }

  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  const destination = new URL(requestUrl);
  destination.host = host;
  if (!origin || origin === destination.origin) return;

  // In GitHub Codespaces HTTPS terminates at GitHub's forwarding proxy.
  // Match the origin to THIS codespace's GitHub-provided environment, not to
  // user-controlled X-Forwarded-* headers. Keep the check Codespaces-only,
  // require the browser's same-origin metadata, and match the forwarded port.
  const codespace = process.env.CODESPACES === "true" ? process.env.CODESPACE_NAME : undefined;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";
  const port = requestUrl.port || destination.port || process.env.PORT || "3000";
  if (
    codespace &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(codespace) &&
    domain === "app.github.dev" &&
    /^[0-9]{2,5}$/.test(port) &&
    fetchSite === "same-origin"
  ) {
    const expectedPublicHost = `${codespace}-${port}.${domain}`;
    const actualHost = destination.hostname.toLowerCase();
    const receivingHost = actualHost === expectedPublicHost ||
      ["localhost", "127.0.0.1", "[::1]"].includes(actualHost);
    if (receivingHost && origin === `https://${expectedPublicHost}`) return;
  }

  throw new ApiError(403, "Cross-site writes are not allowed");
}
export async function requireAdmin(write = false) {
  const client = await createServerSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError(401, "Sign in with your administrator account");
  const { data: profile, error: profileError } = await client.from("admin_profiles").select("role").eq("user_id", user.id).maybeSingle();
  databaseError(profileError);
  if (!profile || !["editor", "publisher"].includes(profile.role)) throw new ApiError(403, "This account has no administrator role");
  if (write && profile.role !== "publisher") throw new ApiError(403, "Publisher access required. Editors have read-only access.");
  return { client, user, role: profile.role as "editor" | "publisher" };
}
export const uuid = z.string().uuid();
