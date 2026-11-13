import type { OCRReviewField } from "@/types/domain";
import { warningsFor, type OcrInputLine, type OcrInputPage } from "@/lib/ocr/extract-fields";
import type { Classification, ProfileId } from "./contract";
import { config, getProfile, type FieldDef } from "./profiles";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasContent = (s: string) => /[\p{L}\p{N}]/u.test(s);
const normalise = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const wholeWord = (keyword: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(normalise(keyword))}(?![\\p{L}\\p{N}])`, "u");

/**
 * Identify the document from its title line. Only lines without a colon count as titles,
 * so a labelled value such as "Purpose: Certificate of Residency" is never mistaken for one.
 * Other documents are checked first, then government IDs, then the three profile titles.
 */
export function classifyDocument(lines: OcrInputLine[]): Classification {
  for (const line of lines) {
    const text = line.text.trim();
    if (line.text.includes(":") || !/\p{L}/u.test(text)) continue;
    const norm = normalise(text);
    const hits = (keywords: string[] | undefined) => !!keywords?.some((k) => wholeWord(k).test(norm));
    const other = config.otherDocuments.find((d) => hits(d.keywords));
    if (other) return { detected: null, otherTitle: other.title, evidence: text };
    const government = config.profiles.find((p) => hits(p.governmentIdKeywords));
    if (government) return { detected: government.id, variant: "government_id", evidence: text };
    const profile = config.profiles.find((p) => hits(p.titleKeywords));
    if (profile) return { detected: profile.id, evidence: text };
  }
  return { detected: null, evidence: "" };
}

type Hit = { line: OcrInputLine; value: string };

function labelRegexes(def: FieldDef) {
  const alt = [...def.keywords].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
  return {
    inline: new RegExp(`^\\s*(?:${alt})\\s*[:\\-–]\\s*(\\S.*)$`, "i"),
    labelOnly: new RegExp(`^\\s*(?:${alt})\\s*[:\\-–]?\\s*$`, "i"),
  };
}

function lowerConfidence(a: OcrInputLine, b: OcrInputLine): number | undefined {
  return a.confidence === undefined || b.confidence === undefined ? undefined : Math.min(a.confidence, b.confidence);
}

function findField(lines: OcrInputLine[], def: FieldDef, all: ReturnType<typeof labelRegexes>[]): Hit | undefined {
  const own = labelRegexes(def);
  const isLabelLine = (text: string) => all.some((r) => r.inline.test(text) || r.labelOnly.test(text));
  for (const line of lines) {
    const m = own.inline.exec(line.text);
    if (m && hasContent(m[1])) return { line, value: m[1].trim() };
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (!own.labelOnly.test(lines[i].text)) continue;
    const next = lines[i + 1];
    if (!hasContent(next.text) || isLabelLine(next.text)) continue;
    const joined = { text: `${lines[i].text}\n${next.text}`, confidence: lowerConfidence(lines[i], next) };
    return { line: joined, value: next.text.trim() };
  }
  for (const pattern of def.patterns ?? []) {
    const re = new RegExp(pattern, "i");
    for (const line of lines) {
      const m = re.exec(line.text);
      if (m?.[1]) return { line, value: m[1].trim() };
    }
  }
  return undefined;
}

function toField(def: FieldDef, hit: Hit | undefined): OCRReviewField {
  const warnings = warningsFor(hit?.line);
  return {
    key: def.key,
    label: def.label,
    value: hit?.value ?? "",
    needsReview: warnings.length > 0,
    originalText: hit?.line.text ?? "",
    warnings,
  };
}

/** Read the selected document's key details from OCR lines. Suggestions only, never a verdict. */
export function extractProfileFields(
  pages: OcrInputPage[],
  profileId: ProfileId,
): { fields: OCRReviewField[]; rawText: string; detected: Classification } {
  const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const lines = ordered.flatMap((p) => p.lines);
  const rawText = ordered.map((p) => p.lines.map((l) => l.text).join("\n")).join("\n\n");
  const profile = getProfile(profileId);
  const regexes = profile.fields.map(labelRegexes);
  const fields = profile.fields.map((def) => toField(def, findField(lines, def, regexes)));
  return { fields, rawText, detected: classifyDocument(lines) };
}
