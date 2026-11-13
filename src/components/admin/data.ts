import { api } from "@/lib/http-client";
import { publicationReadiness } from "@/lib/guides/readiness";

export type Role = "editor" | "publisher";
export type Program = { id: string; title: string; description: string; status: "draft" | "published" | "archived"; created_at: string };
export type Cycle = { id: string; program_id: string; academic_year: string; application_start: string | null; application_end: string | null; official_url: string | null; status: "draft" | "published" | "archived"; published_at: string | null };
export type Requirement = { id: string; cycle_id: string; title: string; description: string; is_required: boolean; position: number; issuing_office?: string; office_address?: string; office_hours?: string; map_url?: string };
export type Step = { id: string; requirement_id: string; instruction: string; position: number };
export type FAQ = { id: string; requirement_id: string; question: string; answer: string };
export type Source = { id: string; cycle_id: string; title: string; source_url: string | null; reviewed_at: string | null; content_version: number; is_approved: boolean; content?: string };
export type AdminData = { programs: Program[]; cycles: Cycle[]; requirements: Requirement[]; steps: Step[]; faqs: FAQ[]; sources: Source[] };
export const emptyData: AdminData = { programs: [], cycles: [], requirements: [], steps: [], faqs: [], sources: [] };

export function isHttpsLink(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname); } catch { return false; }
}

export async function loadAdminData(): Promise<AdminData> {
  return (await api<{ data: AdminData }>("/api/admin/workspace")).data;
}

/** Demo-only preflight; live publication always uses server-verified records. */
export function demoPublicationChecks(data: AdminData, program: Program, cycle: Cycle) {
  const sources = data.sources.filter(source => source.cycle_id === cycle.id);
  return publicationReadiness({
    programId: program.id, cycleId: cycle.id, title: program.title, description: program.description,
    academicYear: cycle.academic_year, applicationStart: cycle.application_start ?? "",
    applicationEnd: cycle.application_end ?? "", officialUrl: cycle.official_url ?? "", status: cycle.status,
    requirements: data.requirements.filter(item => item.cycle_id === cycle.id).map(item => ({
      id: item.id, title: item.title, description: item.description, required: item.is_required,
      issuingOffice: item.issuing_office ?? "", officeAddress: item.office_address ?? "",
      officeHours: item.office_hours ?? "", mapUrl: item.map_url ?? "",
      steps: data.steps.filter(step => step.requirement_id === item.id).sort((a,b) => a.position-b.position).map(step => step.instruction),
      faqs: data.faqs.filter(faq => faq.requirement_id === item.id).map(({ question, answer }) => ({ question, answer })),
    })),
    sources: sources.map(source => ({ id: source.id, title: source.title, url: source.source_url ?? "", content: source.content ?? "", approved: source.is_approved })),
  }, new Set(sources.filter(source => source.reviewed_at).map(source => source.id)), false).checks;
}

export function formatDate(value: string | null): string {
  if (!value) return "Not specified";
  const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
