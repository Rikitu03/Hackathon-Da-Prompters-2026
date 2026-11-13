import "server-only";
import { BUILT_IN_GUIDES } from "@/lib/applicant/built-in-guides";
import type { PromptSource } from "./citations";

/** Only repository-reviewed guides qualify. The caller never supplies their text or references. */
export function builtInCycle(id: string) {
  for (const guide of BUILT_IN_GUIDES) {
    if (guide.demo) continue;
    const cycle = guide.cycles.find(candidate => candidate.id === id);
    if (cycle) return { guide, cycle };
  }
  return null;
}

export function retrieveBuiltInSources(id: string, tsquery: string, requirementId?: string): PromptSource[] {
  const context = builtInCycle(id);
  if (!context) return [];
  const terms = tsquery.split(" | ");
  return context.cycle.requirements.map((requirement, order) => {
    const content = [requirement.title, requirement.description, ...requirement.steps,
      ...requirement.faqs.map(faq => `${faq.question} ${faq.answer}`)].join(" ");
    const words = new Set(content.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u));
    const relevance = terms.reduce((score, term) => score + (words.has(term) ? 1 : 0), 0);
    return { requirement, content, order, relevance, priority: requirement.id === requirementId ? 1 : 0 };
  }).filter(hit => hit.relevance > 0).sort((a,b) => b.priority-a.priority || b.relevance-a.relevance || a.order-b.order)
    .slice(0, 3).map(({requirement, content}) => ({
      sourceId: `built-in:${id}:${requirement.id}`,
      title: `${requirement.title} — reviewed PSCS guide`,
      url: context.cycle.officialUrl,
      reviewedAt: context.cycle.sources.find(source => source.reviewedAt)?.reviewedAt,
      content,
    }));
}
