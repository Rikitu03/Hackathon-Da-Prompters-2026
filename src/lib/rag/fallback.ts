import type { ChatResponse } from "@/types/domain";
import { cycleWindow } from "@/lib/cycle-window";

/** Closed once the Manila date is past application_end. No end date means open. */
export function isCycleClosed(applicationEnd: string | null, now = new Date()): boolean {
  return cycleWindow(null, applicationEnd, now) === "closed";
}

function withUrl(res: ChatResponse, officialUrl: string | null | undefined): ChatResponse {
  return officialUrl ? { ...res, officialUrl } : res;
}

/**
 * Fixed system message (not AI output) for when we have no approved evidence: nothing retrieved,
 * the scope gate refused, or the model cited none of the sources we sent.
 */
export function noEvidenceAnswer(officialUrl?: string | null): ChatResponse {
  return withUrl(
    {
      answer:
        "Hindi ko nakita ito sa opisyal na gabay para sa cycle na ito. / I couldn't find this in the official guidance for this cycle. Please check the official scholarship page or contact the program office.",
      sources: [],
      grounded: false,
    },
    officialUrl,
  );
}

export function closedCycleAnswer(applicationEnd: string, officialUrl?: string | null): ChatResponse {
  const end = applicationEnd.slice(0, 10);
  return withUrl(
    {
      answer: `Natapos na ang application period ng cycle na ito noong ${end}. / This cycle's application period ended on ${end}, so its guide may be out of date. Please check the official scholarship page for the current cycle.`,
      sources: [],
      grounded: false,
    },
    officialUrl,
  );
}
