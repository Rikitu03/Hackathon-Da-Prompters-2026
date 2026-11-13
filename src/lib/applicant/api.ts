import { z } from "zod";
import type {
  PublicProgram,
  ProgramSummary,
  RequirementRow,
} from "@/lib/guides/data";
import {
  safeHttps,
  serviceMessage,
  type Guide,
  type Requirement,
} from "./model";

export class ApplicantApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function request<T>(
  url: string,
  options?: RequestInit,
  service = "Service",
): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApplicantApiError(
      response.status,
      serviceMessage(response.status, service),
    );
  if (!result || typeof result !== "object")
    throw new ApplicantApiError(
      502,
      `${service} returned an unreadable response. Please try again.`,
    );
  return result as T;
}
export function requirementFrom(row: RequirementRow): Requirement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    required: row.is_required,
    issuingOffice: row.issuing_office ?? "", officeAddress: row.office_address ?? "",
    officeHours: row.office_hours ?? "", mapUrl: row.map_url ?? "",
    steps: [...(row.requirement_steps ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.instruction),
    faqs: (row.faqs ?? []).map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
  };
}
export function guideFrom(program: PublicProgram | ProgramSummary): Guide {
  const extended = program as PublicProgram & {
    education_level?: string;
    applicant_type?: string;
  };
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    demo: program.title.startsWith("DEMO"),
    level: extended.education_level,
    cycles: program.application_cycles
      .filter((c) => c.status === "published")
      .map((row) => {
        const full = row as PublicProgram["application_cycles"][number];
        return {
          id: row.id,
          year: row.academic_year,
          start: row.application_start,
          end: row.application_end,
          officialUrl:
            safeHttps(full.official_url) ??
            "https://scholars.pasigcity.gov.ph/",
          applicantType: extended.applicant_type,
          requirements: (full.requirements ?? [])
            .map(requirementFrom)
            .sort(
              (a, b) =>
                (full.requirements?.find((r) => r.id === a.id)?.position ?? 0) -
                (full.requirements?.find((r) => r.id === b.id)?.position ?? 0),
            ),
          sources: (full.knowledge_sources ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            url: safeHttps(s.source_url),
            reviewedAt: s.reviewed_at,
          })),
        };
      }),
  };
}
export async function fetchGuides(signal?: AbortSignal): Promise<Guide[]> {
  const programs: ProgramSummary[] = [];
  const seen = new Set<string>();
  // The public endpoint paginates at 20 records; do not silently hide later guides.
  for (let page = 1; page <= 10000; page++) {
    const data = await request<{
      programs: ProgramSummary[];
      pageSize?: number;
    }>(`/api/scholarships?page=${page}`, { signal }, "Scholarship guides");
    if (!Array.isArray(data.programs))
      throw new Error("The guide list has an unexpected format. Please retry.");
    const next = data.programs.filter((p) => !seen.has(p.id));
    if (data.programs.length && !next.length)
      throw new Error(
        "The guide list could not load its next page. Please retry.",
      );
    next.forEach((p) => {
      seen.add(p.id);
      programs.push(p);
    });
    if (data.programs.length < (data.pageSize ?? 20))
      return programs
        .filter((p) => p.status === "published")
        .map(guideFrom)
        .filter((p) => p.cycles.length);
  }
  throw new Error(
    "The guide list is too large to load. Please check the official portal.",
  );
}
export async function fetchGuide(
  id: string,
  signal?: AbortSignal,
): Promise<Guide> {
  const data = await request<{ program: PublicProgram }>(
    `/api/scholarships/${encodeURIComponent(id)}`,
    { signal },
    "Scholarship guide",
  );
  if (
    !data.program ||
    data.program.status !== "published" ||
    !Array.isArray(data.program.application_cycles)
  )
    throw new Error("This guide is not currently published.");
  const guide = guideFrom(data.program);
  if (!guide.cycles.length)
    throw new Error("No published cycle is available for this guide.");
  return guide;
}
const chatSchema = z.object({
  answer: z.string().min(1),
  grounded: z.boolean(),
  officialUrl: z.string().nullable().optional(),
  sources: z.array(
    z.object({
      sourceId: z.string(),
      title: z.string(),
      url: z.string().optional(),
    }),
  ),
});
export const NO_EVIDENCE_NOTICE = "I couldn't find this in the published guide for this cycle. Check the official page or contact the scholarship office.";
export type ChatReply =
  | { kind: "answer"; answer: string; sources: { sourceId: string; title: string; url?: string }[] }
  | { kind: "notice"; answer: string; officialUrl: string | null };
export async function askGabay(
  cycleId: string,
  message: string,
  requirementId?: string,
  signal?: AbortSignal,
): Promise<ChatReply> {
  const data = await request<unknown>(
    "/api/ai/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId,
        message,
        ...(requirementId ? { requirementId } : {}),
      }),
      signal,
    },
    "Ask Gabay",
  );
  const parsed = chatSchema.safeParse(data);
  if (!parsed.success)
    throw new Error(
      "The assistant returned an unexpected response. Please retry.",
    );
  if (!parsed.data.grounded)
    return {
      kind: "notice",
      answer: parsed.data.answer,
      officialUrl: safeHttps(parsed.data.officialUrl),
    };
  if (!parsed.data.sources.length)
    return { kind: "notice", answer: NO_EVIDENCE_NOTICE, officialUrl: null };
  return { kind: "answer", answer: parsed.data.answer, sources: parsed.data.sources };
}
const ocrSchema = z.object({
  rawText: z.string(),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.string(),
      needsReview: z.boolean().default(false),
      originalText: z.string().default(""),
      warnings: z.array(z.string()).default([]),
    }),
  ),
  warnings: z.array(z.string()).default([]),
  disclaimer: z.string().default(""),
});
export type OcrResult = z.infer<typeof ocrSchema>;
export async function reviewDocument(
  file: File,
  signal?: AbortSignal,
): Promise<OcrResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("consent", "true");
  const data = await request<unknown>(
    "/api/ai/ocr",
    { method: "POST", body: form, signal },
    "Document review",
  );
  const parsed = ocrSchema.safeParse(data);
  if (!parsed.success)
    throw new Error(
      "The review service returned an unexpected format. Please retry or use the manual checklist.",
    );
  return parsed.data;
}
