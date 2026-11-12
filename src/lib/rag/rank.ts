import { z } from "zod";
import type { PromptSource } from "./citations";

const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source_url: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  cycle_id: z.string(),
});
const RowSchema = z.object({
  id: z.string(),
  content: z.string(),
  requirement_id: z.string().nullable().optional(),
  position: z.number().optional(),
  // PostgREST embeds a many-to-one as an object; tolerate a one-element array too.
  knowledge_sources: z.union([SourceSchema, z.array(SourceSchema).length(1).transform((a) => a[0])]),
});

/**
 * Supabase rows → prompt sources. Rows that are malformed, blank, or from another cycle are dropped
 * (the query already scopes by cycle; this is a second check). Chunks tied to the selected requirement
 * come first, then by position. Full-text match order is not ranked yet (no ts_rank via PostgREST).
 */
export function toPromptSources(rows: unknown, cycleId: string, requirementId?: string): PromptSource[] {
  if (!Array.isArray(rows)) return [];
  const valid = rows
    .map((r, index) => ({ parsed: RowSchema.safeParse(r), index }))
    .flatMap(({ parsed, index }) => (parsed.success ? [{ row: parsed.data, index }] : []))
    .filter(({ row }) => row.knowledge_sources.cycle_id === cycleId && row.content.trim().length > 0);

  const forRequirement = (r: (typeof valid)[number]["row"]) => (requirementId && r.requirement_id === requirementId ? 0 : 1);
  valid.sort((a, b) => forRequirement(a.row) - forRequirement(b.row) || (a.row.position ?? 0) - (b.row.position ?? 0) || a.index - b.index);

  return valid.map(({ row }) => ({
    sourceId: row.knowledge_sources.id,
    title: row.knowledge_sources.title,
    url: row.knowledge_sources.source_url ?? null,
    reviewedAt: row.knowledge_sources.reviewed_at ?? null,
    content: row.content,
  }));
}
