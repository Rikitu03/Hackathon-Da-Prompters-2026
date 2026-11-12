import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPages, uploadDocument, waitForRead } from "./ocr";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const record = (Status: string, extra: object = {}) => ({
  data: { DocumentID: "doc-1", Name: "x", MediaType: "image/png", ByteSize: 10, PageCount: 1, Status, FailedPageNumbers: [], CreatedTS: 1, ...extra },
  requestId: "req",
});

beforeEach(() => {
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
  vi.stubEnv("LUMEN_OCR_URL", "https://lumen.test/ocr");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("uploadDocument", () => {
  it("sends raw bytes with the media type and an encoded display name", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(202, record("PROCESSING")));
    const body = new Uint8Array([1, 2, 3]).buffer;
    await expect(uploadDocument(body, "image/png", "gabay upload.png")).resolves.toEqual({
      documentId: "doc-1", status: "PROCESSING", failedPages: [], failureReason: undefined,
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://lumen.test/ocr/documents");
    expect(init.body).toBe(body);
    expect(init.headers).toMatchObject({ "content-type": "image/png", "x-lumen-document-name": "gabay%20upload.png" });
  });
});

describe("waitForRead", () => {
  it("polls until the read is READY", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(200, record("PROCESSING")))
      .mockResolvedValueOnce(json(200, record("READY")));
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const doc = await waitForRead("doc-1", { delaysMs: [1, 2, 3], sleep });
    expect(doc.status).toBe("READY");
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });

  it("returns the last unfinished record when the poll budget runs out", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(200, record("PROCESSING")));
    const doc = await waitForRead("doc-1", { delaysMs: [0, 0], sleep: async () => {} });
    expect(doc.status).toBe("PROCESSING");
  });

  it("surfaces FAILED with its reason", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, record("FAILED", { FailureReason: "corrupt_document" })));
    await expect(waitForRead("doc-1", { delaysMs: [0], sleep: async () => {} })).resolves.toMatchObject({
      status: "FAILED", failureReason: "corrupt_document",
    });
  });
});

describe("getPages", () => {
  it("maps Lumen pages to ordered lines with measured confidence only", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, {
        data: {
          IncludesWords: true,
          Items: [
            { PageNumber: 2, Lines: [{ text: "Page two", confidence: { measured: false, reason: "not_reported" } }] },
            { PageNumber: 1, Lines: [{ text: "Name: Juan", box: {}, confidence: { measured: true, value: 0.98, unit: "word" }, words: [] }] },
          ],
        },
        requestId: "req",
      }),
    );
    await expect(getPages("doc-1")).resolves.toEqual([
      { pageNumber: 1, lines: [{ text: "Name: Juan", confidence: 0.98 }] },
      { pageNumber: 2, lines: [{ text: "Page two", confidence: undefined }] },
    ]);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://lumen.test/ocr/documents/doc-1/pages?IncludeWords=true");
  });
});
