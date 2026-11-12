import "server-only";
import { z } from "zod";
import { getLumenConfig } from "./config";
import { LumenError } from "./errors";
import { lumenFetch } from "./http";

export type OcrMediaType = "application/pdf" | "image/png" | "image/jpeg" | "image/tiff" | "image/webp";
const StatusSchema = z.enum(["PENDING", "PROCESSING", "READY", "PARTIAL", "FAILED"]);
export type OcrStatus = z.infer<typeof StatusSchema>;
export type OcrDocument = { documentId: string; status: OcrStatus; failedPages: number[]; failureReason?: string };
export type OcrPage = { pageNumber: number; lines: { text: string; confidence?: number }[] };

const RecordSchema = z.object({
  data: z.object({
    DocumentID: z.string().min(1),
    Status: StatusSchema,
    FailedPageNumbers: z.array(z.number()).optional(),
    FailureReason: z.string().optional(),
  }),
});
const ConfidenceSchema = z.object({ measured: z.boolean(), value: z.number().optional() }).optional();
const PagesSchema = z.object({
  data: z.object({
    Items: z.array(
      z.object({
        PageNumber: z.number(),
        Lines: z.array(z.object({ text: z.string(), confidence: ConfidenceSchema })).default([]),
      }),
    ),
  }),
});

const DONE: ReadonlySet<OcrStatus> = new Set(["READY", "PARTIAL", "FAILED"]);
const DEFAULT_DELAYS_MS = [1500, 2500, 2500, 2500, 2500, 2500, 2500, 2500]; // ≈19 s, ≤ 8 polls (1 credit each)

function ocrBase(): string {
  const { ocrUrl } = getLumenConfig();
  if (!ocrUrl) throw new LumenError("unconfigured");
  return ocrUrl.replace(/\/+$/, "");
}

function toDocument(json: unknown): OcrDocument {
  const parsed = RecordSchema.safeParse(json);
  if (!parsed.success) throw new LumenError("bad_response");
  const d = parsed.data.data;
  return { documentId: d.DocumentID, status: d.Status, failedPages: d.FailedPageNumbers ?? [], failureReason: d.FailureReason };
}

export async function uploadDocument(body: ArrayBuffer, mediaType: OcrMediaType, displayName: string): Promise<OcrDocument> {
  const { json } = await lumenFetch(`${ocrBase()}/documents`, {
    method: "POST",
    body,
    headers: { "content-type": mediaType, "x-lumen-document-name": encodeURIComponent(displayName) },
    timeoutMs: 15_000,
  });
  return toDocument(json);
}

export async function getDocument(documentId: string): Promise<OcrDocument> {
  const { json } = await lumenFetch(`${ocrBase()}/documents/${encodeURIComponent(documentId)}`, { method: "GET", timeoutMs: 10_000 });
  return toDocument(json);
}

export async function waitForRead(
  documentId: string,
  opts: { delaysMs?: number[]; sleep?: (ms: number) => Promise<void> } = {},
): Promise<OcrDocument> {
  const delays = opts.delaysMs ?? DEFAULT_DELAYS_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let doc: OcrDocument | undefined;
  for (const delay of delays) {
    await sleep(delay);
    doc = await getDocument(documentId);
    if (DONE.has(doc.status)) return doc;
  }
  return doc ?? getDocument(documentId);
}

export async function getPages(documentId: string): Promise<OcrPage[]> {
  // IncludeWords=true is the verified variant; lines come back in reading order.
  const { json } = await lumenFetch(`${ocrBase()}/documents/${encodeURIComponent(documentId)}/pages?IncludeWords=true`, {
    method: "GET",
    timeoutMs: 15_000,
  });
  const parsed = PagesSchema.safeParse(json);
  if (!parsed.success) throw new LumenError("bad_response");
  return parsed.data.data.Items
    .map((item) => ({
      pageNumber: item.PageNumber,
      lines: item.Lines.map((l) => ({ text: l.text, confidence: l.confidence?.measured ? l.confidence.value : undefined })),
    }))
    .sort((a, b) => a.pageNumber - b.pageNumber);
}
