import type { ChatSource } from "@/types/domain";

export type PromptSource = { sourceId: string; title: string; url?: string | null; reviewedAt?: string | null; content: string };

/** Translate prompt passage markers to the deduplicated, first-cited source list. */
export function renumberCitations(answer: string, included: PromptSource[]): { answer: string; sources: ChatSource[] } {
  const numbers = new Map<string, number>();
  const sources: ChatSource[] = [];
  const text = answer.replace(/[\t ]*\[(S\d+(?:\s*,\s*S\d+)*)\]/g, (marker: string, group: string) => {
    const refs = new Set<number>();
    for (const ref of group.matchAll(/S(\d+)/g)) {
      const source = included[Number(ref[1]) - 1];
      if (!source) continue;
      let number = numbers.get(source.sourceId);
      if (!number) {
        number = sources.length + 1;
        numbers.set(source.sourceId, number);
        sources.push({ sourceId: source.sourceId, title: source.title, ...(source.url ? { url: source.url } : {}) });
      }
      refs.add(number);
    }
    return refs.size ? `${marker.match(/^[\t ]*/)?.[0] ?? ""}[${[...refs].join(", ")}]` : "";
  });
  return { answer: text.trim(), sources };
}
