import "server-only";
import { createAnonymousClient } from "@/lib/supabase/server";
import type { PromptSource } from "./citations";
import { toPromptSources } from "./rank";

export class RetrievalError extends Error {
  constructor(readonly code?: string) {
    super(`Knowledge retrieval failed${code ? ` (${code})` : ""}`);
    this.name = "RetrievalError";
  }
}

export type PublishedCycle = { id: string; applicationEnd: string | null; officialUrl: string | null };

/*
 * Always the anonymous client: RLS then guarantees only approved sources in published cycles of
 * published programs are visible. An admin's cookie session would let drafts into answers.
 */

/** The cycle if it is publicly visible (published cycle + published program), else null. */
export async function loadPublishedCycle(cycleId: string): Promise<PublishedCycle | null> {
  const { data, error } = await createAnonymousClient()
    .from("application_cycles")
    .select("id, application_end, official_url")
    .eq("id", cycleId)
    .maybeSingle();
  if (error) throw new RetrievalError(error.code);
  if (!data) return null;
  return { id: data.id, applicationEnd: data.application_end ?? null, officialUrl: data.official_url ?? null };
}

/** Full-text search over published, approved chunks of one cycle. `tsquery` must come from buildTsQuery. */
export async function retrieveSources(opts: {
  cycleId: string;
  requirementId?: string;
  tsquery: string;
  limit?: number;
}): Promise<PromptSource[]> {
  const { data, error } = await createAnonymousClient()
    .from("knowledge_chunks")
    .select("id, content, requirement_id, position, knowledge_sources!inner(id, title, source_url, reviewed_at, cycle_id)")
    .eq("knowledge_sources.cycle_id", opts.cycleId)
    .textSearch("search_vector", opts.tsquery, { config: "simple" })
    .limit(opts.limit ?? 8);
  if (error) throw new RetrievalError(error.code);
  return toPromptSources(data, opts.cycleId, opts.requirementId);
}
