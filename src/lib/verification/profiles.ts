import { z } from "zod";
import raw from "./document-keywords.json";
import { PROFILE_IDS, type ProfileId } from "./contract";

const VALUE_KINDS = ["text", "name", "date", "school_year", "student_no", "year_level", "years"] as const;

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  priority: z.enum(["P0", "P1"]),
  valueKind: z.enum(VALUE_KINDS),
  keywords: z.array(z.string().min(1)).min(1),
  patterns: z.array(z.string().min(1)).optional(),
});
const profileSchema = z.object({
  id: z.enum(PROFILE_IDS),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  requirementIds: z.array(z.string().min(1)),
  requirementTitleKeywords: z.array(z.string().min(1)),
  titleKeywords: z.array(z.string().min(1)).min(1),
  governmentIdKeywords: z.array(z.string().min(1)).optional(),
  fields: z.array(fieldSchema).min(1),
});
const endpointSchema = z.object({ profile: z.enum(PROFILE_IDS), field: z.string().min(1) });
const crossCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["name", "id", "address"]),
  left: endpointSchema,
  right: endpointSchema,
});
const configSchema = z
  .object({
    version: z.string().min(1),
    rules: z.object({
      schoolYearStartMonth: z.number().int().min(1).max(12),
      enrollmentRecency: z.object({
        warnYearsBehind: z.number().int().min(1),
        alertYearsBehind: z.number().int().min(1),
      }),
      studentNoPattern: z.string().min(1),
      studentNoExample: z.string().min(1),
    }),
    profiles: z.array(profileSchema),
    otherDocuments: z.array(z.object({ title: z.string().min(1), keywords: z.array(z.string().min(1)).min(1) })),
    crossChecks: z.array(crossCheckSchema),
  })
  .superRefine((cfg, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    for (const id of PROFILE_IDS) {
      const count = cfg.profiles.filter((p) => p.id === id).length;
      if (count !== 1) issue(`Profile "${id}" must be defined exactly once (found ${count}).`);
    }
    for (const profile of cfg.profiles) {
      const keys = profile.fields.map((f) => f.key);
      if (new Set(keys).size !== keys.length) issue(`Profile "${profile.id}" has duplicate field keys.`);
    }
    for (const check of cfg.crossChecks) {
      for (const side of [check.left, check.right]) {
        const profile = cfg.profiles.find((p) => p.id === side.profile);
        if (!profile?.fields.some((f) => f.key === side.field))
          issue(`Cross-check "${check.id}" names unknown field ${side.profile}.${side.field}.`);
      }
    }
    if (cfg.rules.enrollmentRecency.alertYearsBehind <= cfg.rules.enrollmentRecency.warnYearsBehind)
      issue("alertYearsBehind must be greater than warnYearsBehind.");
    try {
      new RegExp(cfg.rules.studentNoPattern);
    } catch {
      issue("studentNoPattern is not a valid regular expression.");
    }
  });

export type ValueKind = (typeof VALUE_KINDS)[number];
export type FieldDef = z.infer<typeof fieldSchema>;
export type DocumentProfile = z.infer<typeof profileSchema>;
export type CrossCheckDef = z.infer<typeof crossCheckSchema>;
export type VerificationConfig = z.infer<typeof configSchema>;

export function parseConfig(input: unknown): VerificationConfig {
  return configSchema.parse(input);
}

export const config: VerificationConfig = parseConfig(raw);

export function getProfile(id: ProfileId): DocumentProfile {
  const profile = config.profiles.find((p) => p.id === id);
  if (!profile) throw new Error(`Unknown document profile: ${id}`);
  return profile;
}

/** Match a published requirement to a document profile: by id first, then by title keywords in profile order. */
export function profileForRequirement(req: { id: string; title: string }): ProfileId | null {
  const byId = config.profiles.find((p) => p.requirementIds.includes(req.id));
  if (byId) return byId.id;
  const title = req.title.toLowerCase();
  const byTitle = config.profiles.find((p) => p.requirementTitleKeywords.some((k) => title.includes(k.toLowerCase())));
  return byTitle?.id ?? null;
}
