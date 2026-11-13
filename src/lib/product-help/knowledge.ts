import "server-only";
import knowledge from "./knowledge.generated.json";
import { buildTsQuery } from "@/lib/rag/query";
import type { PromptSource } from "@/lib/rag/citations";

export const knowledgeVersion = knowledge.sourceChecksum;
const words = (text: string) => new Set(text.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));

/** Only the reviewed product guide is indexed; arbitrary repository files are never read. */
export function retrieveProductHelp(question: string): PromptSource[] {
  const rawTerms = buildTsQuery(question, 20)?.split(" | ") ?? [];
  const generic = new Set(["use", "gamit", "gamitin", "show", "tell", "please", "app", "gabayiskolar"]);
  const specific = rawTerms.filter(term => !generic.has(term));
  const terms = specific.length ? specific : rawTerms;
  if (!terms.length) return [];
  return knowledge.passages.map((passage, order) => {
    const heading = words(passage.title), tags = words(passage.tags.join(" ")), body = words(passage.content);
    const score = terms.reduce((total, term) => total + (heading.has(term) ? 3 : 0) + (tags.has(term) ? 4 : 0) + (body.has(term) ? 1 : 0), 0);
    return { passage, order, score };
  }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 3)
    .map(({ passage }) => ({ sourceId: passage.sourceId, title: passage.title, content: passage.content }));
}
