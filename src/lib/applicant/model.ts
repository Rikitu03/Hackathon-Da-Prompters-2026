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
  if (file.size > 10 * 1024 * 1024)
    return "This file is over the 10 MB browser upload limit. Choose a smaller copy.";
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
