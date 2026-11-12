import type { ChatSource } from "@/types/domain";

export type PromptSource = { sourceId: string; title: string; url?: string | null; reviewedAt?: string | null; content: string };

/** Map the model's [S#] markers back to the sources we actually sent. Unknown numbers are dropped. */
export function mapCitations(answer: string, included: PromptSource[]): ChatSource[] {
  const seen = new Set<string>();
  const out: ChatSource[] = [];
  for (const group of answer.matchAll(/\[([^\]]{1,40})\]/g)) {
    for (const ref of group[1].matchAll(/S(\d{1,2})/g)) {
      const src = included[Number(ref[1]) - 1];
      if (!src || seen.has(src.sourceId)) continue;
      seen.add(src.sourceId);
      out.push(src.url ? { sourceId: src.sourceId, title: src.title, url: src.url } : { sourceId: src.sourceId, title: src.title });
    }
  }
  return out;
}
