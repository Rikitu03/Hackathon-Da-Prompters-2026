import { randomUUID } from "node:crypto";
import { OCR_MAX_UPLOAD_BYTES as MAX_UPLOAD_BYTES } from "@/lib/ai-limits";
import { json, sameOrigin } from "@/lib/api"; // team helper: NextResponse.json + "Cache-Control: private, no-store"
import { LumenError, lumenErrorToHttp } from "@/lib/lumen/errors";
import { getPages, uploadDocument, waitForRead } from "@/lib/lumen/ocr";
import { detectMediaType, type SniffedMediaType } from "@/lib/ocr/file-type";
import { extractFields } from "@/lib/ocr/extract-fields";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { PROFILE_IDS, type ProfileId } from "@/lib/verification/contract";
import { extractProfileFields } from "@/lib/verification/extract";

export const runtime = "nodejs";
export const maxDuration = 60; // upload (≤15 s) + polling (≤25 s, see waitForRead) + pages (≤15 s)

// Best-effort, per server instance only (not shared across serverless instances).
const ocrLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

const EXTENSION: Record<SniffedMediaType, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/tiff": "tiff", "image/webp": "webp",
};
function failureMessage(reason?: string): string {
  return reason === "timeout" || reason === "unavailable"
    ? "The document reader is busy. Please try again in a moment."
    : "We couldn't read this document. Try a clearer, well-lit photo, or skip this step.";
}

export async function POST(request: Request) {
  if (process.env.LUMEN_OCR_ENABLED === "false")
    return json({ error: "Document reading is turned off right now." }, 503);
  if (!process.env.LUMEN_OCR_URL || !process.env.LUMEN_API_KEY || !process.env.LUMEN_API_SECRET)
    return json({ error: "Lumen OCR integration not configured" }, 503);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return json({ error: "Expected multipart/form-data" }, 415);
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Cross-site requests are not allowed." }, 403);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024)
    return json({ error: "File is too large (max 4 MB)." }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Could not read the upload." }, 400);
  }
  if (form.get("consent") !== "true") return json({ error: "Consent is required to process your document." }, 400);
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Attach a document in the 'file' field." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "File is too large (max 4 MB)." }, 413);

  // Optional: read the details of one known document instead of the six general fields.
  const profileField = form.get("profile");
  let profileId: ProfileId | undefined;
  if (profileField !== null && profileField !== "") {
    if (typeof profileField !== "string" || !(PROFILE_IDS as readonly string[]).includes(profileField))
      return json({ error: "Unknown document type." }, 400);
    profileId = profileField as ProfileId;
  }

  const buffer = await file.arrayBuffer();
  const mediaType = detectMediaType(new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength)));
  if (!mediaType) return json({ error: "Unsupported file type. Use a JPG, PNG, WebP, TIFF or PDF." }, 415);

  // Only requests that passed all validation spend Lumen credits, so only they are counted.
  const limit = ocrLimiter.take(clientKey(request));
  if (!limit.ok) {
    const res = json({ error: "Too many documents uploaded. Please wait a few minutes and try again." }, 429);
    res.headers.set("Retry-After", String(limit.retryAfterSec));
    return res;
  }

  try {
    // Lumen keeps uploads org-wide and permanently: never send the student's own file name.
    const displayName = `gabay-upload-${randomUUID().slice(0, 8)}.${EXTENSION[mediaType]}`;
    const uploaded = await uploadDocument(buffer, mediaType, displayName);
    const doc = uploaded.status === "READY" || uploaded.status === "PARTIAL" || uploaded.status === "FAILED"
      ? uploaded
      : await waitForRead(uploaded.documentId);
    console.info("[ocr]", { documentId: doc.documentId, status: doc.status, bytes: file.size, mediaType });
    if (doc.status === "FAILED") return json({ error: failureMessage(doc.failureReason) }, 422);
    if (doc.status !== "READY" && doc.status !== "PARTIAL")
      return json({ error: "Reading is taking longer than expected. Please try again in a moment." }, 504);
    const pages = await getPages(doc.documentId);
    const general = extractFields(pages, { failedPages: doc.failedPages });
    if (!profileId) return json(general, 200);
    const read = extractProfileFields(pages, profileId);
    return json({ ...general, fields: read.fields, profileId, detected: read.detected }, 200);
  } catch (err) {
    if (err instanceof LumenError) {
      console.warn("[ocr] lumen error", { kind: err.kind, status: err.status, code: err.code });
      const { status, message } = lumenErrorToHttp(err);
      return json({ error: message }, status);
    }
    console.error("[ocr] unexpected error", err instanceof Error ? err.name : "unknown");
    return json({ error: "We couldn't read this document. Try a clearer, well-lit photo, or skip this step." }, 500);
  }
}
