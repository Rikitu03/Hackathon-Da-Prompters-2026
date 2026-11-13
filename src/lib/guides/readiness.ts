import type { GuideDocument } from "./schema";
const https = (value: string) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
export function publicationReadiness(guide: GuideDocument, reviewedSourceIds: Set<string>, publisher: boolean) {
  const checks = [
    { name: "The guide is a draft", ok: guide.status === "draft" },
    { name: "Program title, description, and academic year", ok: Boolean(guide.title.trim() && guide.description.trim() && guide.academicYear.trim()) },
    { name: "Valid application dates", ok: Boolean(guide.applicationStart && guide.applicationEnd && guide.applicationEnd >= guide.applicationStart) },
    { name: "Official application link uses HTTPS", ok: https(guide.officialUrl) },
    { name: "At least one requirement exists", ok: guide.requirements.length > 0 },
    { name: "Every requirement has acquisition steps", ok: guide.requirements.length > 0 && guide.requirements.every((item) => item.title.trim() && item.steps.some((step) => step.trim())) },
    { name: "Approved, dated source with stored reference text", ok: guide.sources.some((source) => source.approved && source.id && reviewedSourceIds.has(source.id) && https(source.url) && Boolean(source.content.trim())) },
    { name: "Publisher authorization verified by the server", ok: publisher },
  ];
  return { checks, ready: checks.every((check) => check.ok), status: guide.status };
}
