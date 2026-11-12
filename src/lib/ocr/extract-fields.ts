import type { OCRReviewField, OCRReviewResponse } from "@/types/domain";

export type OcrInputLine = { text: string; confidence?: number };
export type OcrInputPage = { pageNumber: number; lines: OcrInputLine[] };

export const OCR_DISCLAIMER =
  "Automatically read text may contain errors. Please review every field. This tool does not verify documents or decide eligibility.";
export const LOW_CONFIDENCE = 0.9;

const DOC_TYPE_RE = /\b(certificate|certification|clearance|report card|transcript|permit)\b/i;
const FIELD_DEFS: { key: string; label: string; aliases: string[] }[] = [
  { key: "full_name", label: "Full name", aliases: ["name", "full name", "pangalan"] },
  { key: "barangay", label: "Barangay", aliases: ["barangay", "brgy"] },
  { key: "date_issued", label: "Date issued", aliases: ["date issued", "issued on", "petsa"] },
  { key: "purpose", label: "Purpose", aliases: ["purpose", "layunin"] },
  { key: "issuing_office", label: "Issuing office", aliases: ["issuing office", "issued by"] },
];

type Hit = { line: OcrInputLine; value: string };
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findLabelled(lines: OcrInputLine[], aliases: string[]): Hit | undefined {
  const alt = [...aliases].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
  const re = new RegExp(`^\\s*(?:${alt})\\s*[:\\-–]\\s*(\\S.*)$`, "i");
  for (const line of lines) {
    const m = re.exec(line.text);
    if (!m) continue;
    const value = m[1].trim();
    if (/[\p{L}\p{N}]/u.test(value)) return { line, value }; // blanks/placeholders like "____" are "not found"
  }
  return undefined;
}

function warningsFor(line: OcrInputLine | undefined): string[] {
  if (!line) return ["Not found. Please fill this in if it applies."];
  if (line.confidence === undefined) return ["Confidence not reported. Please check."];
  if (line.confidence < LOW_CONFIDENCE) return ["Low confidence. Please check."];
  return [];
}

function toField(key: string, label: string, hit: Hit | undefined): OCRReviewField {
  const warnings = warningsFor(hit?.line);
  return { key, label, value: hit?.value ?? "", needsReview: warnings.length > 0, originalText: hit?.line.text ?? "", warnings };
}

/** Turn OCR lines into editable suggestions. Suggestions only: never a verification or eligibility verdict. */
export function extractFields(pages: OcrInputPage[], opts: { failedPages?: number[] } = {}): OCRReviewResponse {
  const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const lines = ordered.flatMap((p) => p.lines);
  const rawText = ordered.map((p) => p.lines.map((l) => l.text).join("\n")).join("\n\n");
  const docLine = lines.find((l) => !l.text.includes(":") && DOC_TYPE_RE.test(l.text));
  const fields = [
    toField("document_type", "Document type", docLine ? { line: docLine, value: docLine.text.trim() } : undefined),
    ...FIELD_DEFS.map((d) => toField(d.key, d.label, findLabelled(lines, d.aliases))),
  ];
  const warnings: string[] = [];
  if (lines.length === 0) warnings.push("No text was found. Try a clearer, well-lit photo.");
  if (opts.failedPages?.length) warnings.push(`Some pages could not be read: ${opts.failedPages.join(", ")}.`);
  return { fields, rawText, warnings, disclaimer: OCR_DISCLAIMER };
}
