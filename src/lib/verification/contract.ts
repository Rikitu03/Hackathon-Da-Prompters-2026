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
