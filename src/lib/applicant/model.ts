import { OCR_MAX_UPLOAD_BYTES } from "../ai-limits";

export const OFFICIAL_PORTAL = "https://scholars.pasigcity.gov.ph/";
export const STATUSES = [
  "not-started",
  "in-progress",
  "needs-review",
  "prepared",
] as const;
export type Status = (typeof STATUSES)[number];
export const statusLabels: Record<Status, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "needs-review": "Needs review",
  prepared: "Prepared",
};
export type Source = {
  id: string;
  title: string;
  url: string | null;
  reviewedAt: string | null;
};
export type Requirement = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  steps: string[];
  faqs: { question: string; answer: string }[];
  issuingOffice?: string;
  officeAddress?: string;
  officeHours?: string;
  mapUrl?: string;
};
export type Cycle = {
  id: string;
  year: string;
  start: string | null;
  end: string | null;
  officialUrl: string;
  requirements: Requirement[];
  sources: Source[];
  applicantType?: string;
};
export type Guide = {
  id: string;
  title: string;
  description: string;
  demo: boolean;
  level?: string;
  /** Shown on the checklist when a guide covers only part of the official list. */
  scope?: string;
  cycles: Cycle[];
};
export type Preferences = {
  level: string;
  applicantType: string;
  programId: string;
  cycleId: string;
};
export type Entry = { status: Status; signature: string };
export type Progress = Record<string, Entry>;

export type StageId = "guide" | "checklist" | "document" | "ask" | "official";
export const JOURNEY_STAGES: readonly { id: StageId; label: string; href: string; description: string }[] = [
  { id: "guide", label: "Choose a guide", href: "/onboarding", description: "Find the published scholarship and cycle you want to prepare for." },
  { id: "checklist", label: "Prepare your checklist", href: "/my-checklist", description: "Read the steps and record your own preparation status." },
  { id: "document", label: "Check a document", href: "/document-review", description: "Read a fictional document and correct the extracted details." },
  { id: "ask", label: "Ask Gabay", href: "/assistant", description: "Ask a question and follow its published source references." },
  { id: "official", label: "Take the official step", href: "/summary", description: "Review your preparation and continue to the official application page." },
];
export function stageForPath(path: string): StageId | null {
  if (path === "/onboarding" || path === "/scholarships" || path.startsWith("/scholarships/")) return "guide";
  if (path === "/my-checklist" || path.startsWith("/requirements/")) return "checklist";
  return JOURNEY_STAGES.find((stage) => stage.href === path)?.id ?? null;
}
export function journeyProgress(input: { hasCycle: boolean; prepared: number; total: number; documentsChecked: number; asked: boolean }): Record<StageId, "done" | "todo"> {
  return {
    guide: input.hasCycle ? "done" : "todo",
    checklist: input.total > 0 && input.prepared === input.total ? "done" : "todo",
    document: input.documentsChecked > 0 ? "done" : "todo",
    ask: input.asked ? "done" : "todo",
    official: "todo",
  };
}
export function nextStage(progress: Record<StageId, "done" | "todo">): StageId {
  return JOURNEY_STAGES.find((stage) => progress[stage.id] === "todo")?.id ?? "official";
}
export function citedSegments(text: string, sourceCount: number): ({ text: string } | { cite: number })[] {
  const result: ({ text: string } | { cite: number })[] = [];
  const append = (value: string) => {
    if (!value) return;
    const last = result.at(-1);
    if (last && "text" in last) last.text += value;
    else result.push({ text: value });
  };
  let cursor = 0;
  for (const match of text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    append(text.slice(cursor, match.index));
    const refs = match[1].split(",").map(Number);
    if (refs.every((n) => n >= 1 && n <= sourceCount)) refs.forEach((cite) => result.push({ cite }));
    else append(match[0]);
    cursor = match.index! + match[0].length;
  }
  append(text.slice(cursor));
  return result;
}

export function signature(
  requirement: Requirement,
  sources: Source[] = [],
): string {
  const value = JSON.stringify([requirement, sources]);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
export function reconcile(
  requirement: Requirement,
  saved: unknown,
  sources: Source[] = [],
): Entry {
  const current = signature(requirement, sources);
  if (!saved || typeof saved !== "object")
    return { status: "not-started", signature: current };
  const entry = saved as Partial<Entry>;
  if (
    !STATUSES.includes(entry.status as Status) ||
    typeof entry.signature !== "string"
  )
    return { status: "not-started", signature: current };
  // Retain the old signature until the student explicitly reviews the update.
  return entry.signature === current
    ? { status: entry.status as Status, signature: current }
    : { status: "needs-review", signature: entry.signature };
}
export function progressOf(requirements: Requirement[], entries: Progress) {
  const prepared = requirements.filter(
    (r) => entries[r.id]?.status === "prepared",
  ).length;
  return {
    prepared,
    total: requirements.length,
    percent: requirements.length
      ? Math.round((prepared / requirements.length) * 100)
      : 0,
  };
}
export function storageKey(cycleId: string, requirementId: string) {
  return `gabayiskolar:preparation:v1:${cycleId}:${requirementId}`;
}
export function safeHttps(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export function validateFile(file: {
  size: number;
  type: string;
  name: string;
}): string | null {
  if (!file.size) return "This file is empty. Choose a readable image or PDF.";
  if (file.size > OCR_MAX_UPLOAD_BYTES)
    return "This file is larger than 4 MB. Choose a smaller copy.";
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
    return "Choose a JPG, PNG, or PDF file.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    (file.type === "application/pdf" && extension !== "pdf") ||
    (file.type === "image/png" && extension !== "png") ||
    (file.type === "image/jpeg" && !["jpg", "jpeg"].includes(extension ?? ""))
  )
    return "The file extension does not match its type. Choose a valid JPG, PNG, or PDF.";
  return null;
}
export function serviceMessage(status: number, service: string): string {
  if (status === 403)
    return `${service} blocked a request from another site. Reload GabayIskolar and try again.`;
  if (status === 404)
    return "This guide is no longer published. Choose a current guide to continue.";
  if (status === 422)
    return "The document couldn't be read. Try a clearer, well-lit photo, or continue with the written guide.";
  if (status === 502 || status === 504)
    return `${service} didn't respond in time. Try again in a moment.`;
  if (status === 400 || status === 415)
    return `The ${service} request could not be read. Check your input and try again.`;
  if (status === 413)
    return "The service could not accept this file size. Choose a smaller copy.";
  if (status === 429)
    return "Too many requests. Please wait a moment before trying again.";
  if (status === 501)
    return `${service} is not connected yet. You can still use the preparation guides and checklist.`;
  if (status === 503)
    return `${service} ${service === "Scholarship guides" ? "are" : "is"} unavailable right now. Your checklist is still available.`;
  return `${service} could not finish this request. Try again or continue with the manual guide.`;
}
