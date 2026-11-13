import type { OCRReviewField } from "@/types/domain";
import { crossCheck, flagsFromComparisons, type Comparison } from "./compare";
import {
  PROFILE_IDS, type Classification, type DocumentRecord, type FieldValues, type Flag, type ProfileId, type RecordMap, type Severity,
} from "./contract";
import { extractProfileFields } from "./extract";
import { checkDocument } from "./rules";
import { samplePages, type SampleVariant } from "./samples";

export type Analysis = {
  profileId: ProfileId;
  flags: Flag[];
  comparisons: Comparison[];
  counts: Record<Severity, number>;
};

const RAW_TEXT_LIMIT = 20_000;
const SEVERITY_ORDER: Record<Severity, number> = { alert: 0, warning: 1, info: 2 };
const ORIGIN_ORDER: Record<Flag["origin"], number> = { rule: 0, "cross-check": 1, ai: 2 };

export const valuesOf = (record: DocumentRecord): FieldValues =>
  Object.fromEntries(record.fields.map((f) => [f.key, f.value]));

export function recordFromSample(profileId: ProfileId, variant: SampleVariant, now: Date): DocumentRecord {
  const read = extractProfileFields(samplePages(profileId, variant, now), profileId);
  return {
    profileId, source: "sample", sampleVariant: variant,
    fields: read.fields, rawText: read.rawText.slice(0, RAW_TEXT_LIMIT), detected: read.detected,
    analyzedAt: now.toISOString(),
  };
}

export function recordFromOcr(
  profileId: ProfileId,
  result: { fields: OCRReviewField[]; rawText: string; detected?: Classification },
  now: Date,
): DocumentRecord {
  return {
    profileId, source: "upload",
    fields: result.fields, rawText: result.rawText.slice(0, RAW_TEXT_LIMIT),
    detected: result.detected ?? { detected: null, evidence: "" },
    analyzedAt: now.toISOString(),
  };
}

/** Rule flags, cross-document flags and Lumen AI flags for one document, most serious first. */
export function analyzeDocument(profileId: ProfileId, records: RecordMap, now: Date): Analysis | null {
  const record = records[profileId];
  if (!record) return null;
  const values: Partial<Record<ProfileId, FieldValues>> = {};
  for (const id of PROFILE_IDS) {
    const other = records[id];
    if (other) values[id] = valuesOf(other);
  }
  const comparisons = crossCheck(values).filter((c) => c.left.profile === profileId || c.right.profile === profileId);
  const flags = [
    ...checkDocument({ profileId, values: valuesOf(record), detected: record.detected, now }),
    ...flagsFromComparisons(comparisons, profileId),
    ...(record.ai?.status === "ok" ? record.ai.flags : []),
  ]
    .map((flag, index) => ({ flag, index }))
    .sort((a, b) =>
      SEVERITY_ORDER[a.flag.severity] - SEVERITY_ORDER[b.flag.severity] ||
      ORIGIN_ORDER[a.flag.origin] - ORIGIN_ORDER[b.flag.origin] ||
      a.index - b.index)
    .map((entry) => entry.flag);
  const counts: Record<Severity, number> = { alert: 0, warning: 0, info: 0 };
  for (const flag of flags) counts[flag.severity]++;
  return { profileId, flags, comparisons, counts };
}
