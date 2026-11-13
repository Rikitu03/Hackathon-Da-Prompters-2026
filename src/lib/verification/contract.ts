// Shared ids, types and schemas for document verification.
// Keep this file free of "@/" and JSON imports: tests/applicant-*.test.mjs load
// src/lib/applicant/api.ts, which imports it, through Node's minimal loader.
import { z } from "zod";

export const PROFILE_IDS = ["certificate_of_registration", "certificate_of_residency", "school_id"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

/** alert = "Possible mismatch", warning = "Check this", info = "Note". */
export const SEVERITIES = ["alert", "warning", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const flagSchema = z.object({
  id: z.string().min(1).max(80),
  severity: z.enum(SEVERITIES),
  title: z.string().min(1).max(160),
  detail: z.string().max(400),
  fieldKeys: z.array(z.string().max(40)),
  origin: z.enum(["rule", "cross-check", "ai"]),
});
export type Flag = z.infer<typeof flagSchema>;

export const classificationSchema = z.object({
  detected: z.enum(PROFILE_IDS).nullable(),
  variant: z.literal("government_id").optional(),
  otherTitle: z.string().max(120).optional(),
  evidence: z.string().max(300),
});
export type Classification = z.infer<typeof classificationSchema>;

export type FieldValues = Record<string, string>;

/** Lumen AI's second opinion, stored with the record it reviewed. */
export const aiReviewSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), flags: z.array(flagSchema).max(10), reviewedAt: z.string().max(40) }),
  z.object({ status: z.literal("unavailable"), message: z.string().max(300) }),
]);
export type AiReview = z.infer<typeof aiReviewSchema>;

const recordFieldSchema = z.object({
  key: z.string().max(40),
  label: z.string().max(60),
  value: z.string().max(1000),
  needsReview: z.boolean(),
  originalText: z.string().max(2000),
  warnings: z.array(z.string().max(300)).max(10),
});

/** One checked document, kept only in this browser tab (see store.ts). */
export const documentRecordSchema = z.object({
  profileId: z.enum(PROFILE_IDS),
  source: z.enum(["upload", "sample"]),
  sampleVariant: z.enum(["clean", "with-issues"]).optional(),
  fields: z.array(recordFieldSchema).max(20),
  rawText: z.string().max(20000),
  detected: classificationSchema,
  analyzedAt: z.string().max(40),
  correctedAt: z.string().max(40).optional(),
  ai: aiReviewSchema.optional(),
});
export type DocumentRecord = z.infer<typeof documentRecordSchema>;
export type RecordMap = Partial<Record<ProfileId, DocumentRecord>>;

const aiFieldSchema = z.object({ key: z.string().max(40), label: z.string().max(60), value: z.string().max(200) });

/** What the browser may send for a Lumen AI review: a few short details, never a file. */
export const aiReviewRequestSchema = z.object({
  consent: z.literal(true),
  profileId: z.enum(PROFILE_IDS),
  fields: z.array(aiFieldSchema).max(12),
  rawText: z.string().max(1500),
  related: z.array(z.object({ profileId: z.enum(PROFILE_IDS), fields: z.array(aiFieldSchema).max(12) })).max(2),
});
export type AiReviewRequest = z.infer<typeof aiReviewRequestSchema>;

export const aiReviewResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), flags: z.array(flagSchema).max(10) }),
  z.object({ status: z.literal("unavailable"), message: z.string().max(300) }),
]);
export type AiReviewResponse = z.infer<typeof aiReviewResponseSchema>;
