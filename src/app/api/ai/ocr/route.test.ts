import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/lumen/ocr", () => ({ uploadDocument: vi.fn(), waitForRead: vi.fn(), getPages: vi.fn() }));

import { getPages, uploadDocument, waitForRead } from "@/lib/lumen/ocr";
import { LumenError } from "@/lib/lumen/errors";
import { demoPages } from "@/lib/ocr/__fixtures__/demo-pages";
import { samplePages } from "@/lib/verification/samples";
import { POST } from "./route";

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function pngFile(size = 64, name = "Juan-Dela-Cruz-indigency.png") {
  const bytes = new Uint8Array(size);
  bytes.set(PNG_HEAD);
  return new File([bytes], name, { type: "image/png" });
}
function ocrRequest(fields: Record<string, string | File>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request("http://localhost/api/ai/ocr", { method: "POST", body: form, headers });
}

beforeEach(() => {
  vi.stubEnv("LUMEN_API_KEY", "test-key");
  vi.stubEnv("LUMEN_API_SECRET", "test-secret");
  vi.stubEnv("LUMEN_OCR_URL", "https://lumen.test/ocr");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/ai/ocr", () => {
  it("returns 503 when Lumen OCR is not configured", async () => {
    vi.stubEnv("LUMEN_OCR_URL", "");
    expect((await POST(ocrRequest({ consent: "true", file: pngFile() }))).status).toBe(503);
  });

  it("requires consent", async () => {
    const res = await POST(ocrRequest({ file: pngFile() }));
    expect(res.status).toBe(400);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects files whose bytes are not an accepted type", async () => {
    const fake = new File([new TextEncoder().encode("not really a png")], "x.png", { type: "image/png" });
    expect((await POST(ocrRequest({ consent: "true", file: fake }))).status).toBe(415);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects files over 4 MB", async () => {
    const res = await POST(ocrRequest({ consent: "true", file: pngFile(4 * 1024 * 1024 + 1) }));
    expect(res.status).toBe(413);
  });

  it("uploads with a generic name, waits for the read and returns editable fields", async () => {
    vi.mocked(uploadDocument).mockResolvedValue({ documentId: "doc-1", status: "PROCESSING", failedPages: [] });
    vi.mocked(waitForRead).mockResolvedValue({ documentId: "doc-1", status: "READY", failedPages: [] });
    vi.mocked(getPages).mockResolvedValue(demoPages);

    const res = await POST(ocrRequest({ consent: "true", file: pngFile() }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.fields.find((f: { key: string }) => f.key === "full_name").value).toBe("Juan Dela Cruz (fictional)");
    expect(body.profileId).toBeUndefined();

    const [, mediaType, displayName] = vi.mocked(uploadDocument).mock.calls[0];
    expect(mediaType).toBe("image/png");
    expect(displayName).toMatch(/^gabay-upload-[0-9a-f]{8}\.png$/);
    expect(displayName).not.toContain("Juan");
  });

  it("extracts the selected document's details when a profile is sent", async () => {
    vi.mocked(uploadDocument).mockResolvedValue({ documentId: "doc-2", status: "READY", failedPages: [] });
    vi.mocked(getPages).mockResolvedValue(samplePages("certificate_of_registration", "clean", new Date(2026, 10, 13)));
    const res = await POST(ocrRequest({ consent: "true", file: pngFile(), profile: "certificate_of_registration" }, { "x-forwarded-for": "198.51.100.40" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.profileId).toBe("certificate_of_registration");
    expect(body.detected).toMatchObject({ detected: "certificate_of_registration" });
    expect(body.fields.map((f: { key: string }) => f.key)).toEqual(
      ["student_no", "student_name", "address", "course", "department", "enrollment_date", "school_year", "year_level"]);
    expect(body.warnings).toEqual([]);
    expect(body.disclaimer).toMatch(/does not verify documents/);
  });

  it("rejects an unknown profile before spending credits", async () => {
    const res = await POST(ocrRequest({ consent: "true", file: pngFile(), profile: "passport_photo" }, { "x-forwarded-for": "198.51.100.41" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown document type." });
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("returns 422 when Lumen could not read the document", async () => {
    vi.mocked(uploadDocument).mockResolvedValue({ documentId: "doc-1", status: "PROCESSING", failedPages: [] });
    vi.mocked(waitForRead).mockResolvedValue({ documentId: "doc-1", status: "FAILED", failedPages: [], failureReason: "corrupt_document" });
    expect((await POST(ocrRequest({ consent: "true", file: pngFile() }))).status).toBe(422);
  });

  it("maps Lumen credential errors to a generic 502", async () => {
    vi.mocked(uploadDocument).mockRejectedValue(new LumenError("auth", 401, "INVALID_API_CREDENTIALS"));
    const res = await POST(ocrRequest({ consent: "true", file: pngFile() }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "AI service unavailable." });
  });

  it("returns 503 and does not upload when the kill switch is off", async () => {
    vi.stubEnv("LUMEN_OCR_ENABLED", "false");
    const res = await POST(ocrRequest({ consent: "true", file: pngFile() }));
    expect(res.status).toBe(503);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects cross-site requests with 403", async () => {
    const res = await POST(ocrRequest({ consent: "true", file: pngFile() }, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rate limits valid uploads per IP (5 per window) with Retry-After", async () => {
    vi.mocked(uploadDocument).mockResolvedValue({ documentId: "doc-1", status: "READY", failedPages: [] });
    vi.mocked(getPages).mockResolvedValue(demoPages);
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 5; i++) {
      expect((await POST(ocrRequest({ consent: "true", file: pngFile() }, ip))).status).toBe(200);
    }
    const blocked = await POST(ocrRequest({ consent: "true", file: pngFile() }, ip));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(uploadDocument).toHaveBeenCalledTimes(5);
    const other = await POST(ocrRequest({ consent: "true", file: pngFile() }, { "x-forwarded-for": "198.51.100.2" }));
    expect(other.status).toBe(200);
  });
});
