import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/lib/api";
import type { GuideDocument } from "./schema";

export type RequirementRow = {
  id: string; title: string; description: string; is_required: boolean; position: number;
  issuing_office?: string; office_address?: string; office_hours?: string; map_url?: string;
  requirement_steps: { id: string; position: number; instruction: string }[];
  faqs: { id: string; question: string; answer: string }[];
};
export type PublicCycle = {
  id: string; academic_year: string; application_start: string | null; application_end: string | null;
  official_url: string | null; published_at: string | null; status: string;
  requirements: RequirementRow[];
  knowledge_sources: { id: string; title: string; source_url: string | null; reviewed_at: string | null }[];
};
export type PublicProgram = { id: string; title: string; description: string; status: string; application_cycles: PublicCycle[] };
export type ProgramSummary = Omit<PublicProgram, "application_cycles"> & { application_cycles: Pick<PublicCycle, "id" | "academic_year" | "application_start" | "application_end" | "status">[] };

export async function publicPrograms(client: SupabaseClient, page = 1) {
  const { data, error } = await client.from("scholarship_programs")
    .select("id,title,description,status,application_cycles!inner(id,academic_year,application_start,application_end,status)")
    .eq("status", "published").order("created_at", { ascending: false }).range((page-1)*20, page*20-1);
  databaseError(error);
  return (data as unknown as ProgramSummary[]).filter((program) => program.application_cycles.length);
}
export async function publicProgram(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("scholarship_programs").select(`
    id,title,description,status,application_cycles(
      id,academic_year,application_start,application_end,official_url,published_at,status,
      requirements(id,title,description,is_required,position,issuing_office,office_address,office_hours,map_url,requirement_steps(id,position,instruction),faqs(id,question,answer)),
      knowledge_sources(id,title,source_url,reviewed_at))`).eq("id", id).eq("status", "published").maybeSingle();
  databaseError(error);
  if (!data || !(data as unknown as PublicProgram).application_cycles.length) throw new ApiError(404, "Published scholarship not found");
  return data as unknown as PublicProgram;
}
export async function adminGuide(client: SupabaseClient, id: string): Promise<GuideDocument> {
  const { data, error } = await client.from("application_cycles").select(`*,
    scholarship_programs(id,title,description,status),
    requirements(id,title,description,is_required,position,issuing_office,office_address,office_hours,map_url,requirement_steps(id,position,instruction),faqs(id,question,answer)),
    knowledge_sources(id,title,source_url,is_approved,knowledge_chunks(id,content))`).eq("id", id).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, "Guide not found");
  const cycle = data as unknown as Omit<PublicCycle, "knowledge_sources"> & {
    scholarship_programs: { id: string; title: string; description: string; status: string };
    knowledge_sources: { id: string; title: string; source_url: string | null; is_approved: boolean; knowledge_chunks: { id: string; content: string }[] }[];
  };
  // Fetch chunks in insertion order is not guaranteed. The database returns a complete
  // source document through the ordered source text RPC instead of relying on UUID order.
  const { data: sourceText, error: sourceError } = await client.rpc("guide_source_text", { p_cycle_id: id });
  databaseError(sourceError);
  const content = sourceText as { source_id: string; content: string }[];
  return {
    programId: cycle.scholarship_programs.id, cycleId: cycle.id, title: cycle.scholarship_programs.title,
    description: cycle.scholarship_programs.description, academicYear: cycle.academic_year,
    applicationStart: cycle.application_start ?? "", applicationEnd: cycle.application_end ?? "", officialUrl: cycle.official_url ?? "", status: cycle.status === "published" && cycle.scholarship_programs.status === "published" ? "published" : "draft",
    requirements: cycle.requirements.sort((a,b) => a.position-b.position).map((requirement) => ({
      id: requirement.id, title: requirement.title, description: requirement.description, required: requirement.is_required,
      issuingOffice: requirement.issuing_office ?? "", officeAddress: requirement.office_address ?? "",
      officeHours: requirement.office_hours ?? "", mapUrl: requirement.map_url ?? "",
      steps: requirement.requirement_steps.sort((a,b) => a.position-b.position).map((step) => step.instruction),
      faqs: requirement.faqs.map(({ question, answer }) => ({ question, answer })),
    })),
    sources: cycle.knowledge_sources.map((source) => ({ id: source.id, title: source.title, url: source.source_url ?? "", approved: source.is_approved,
      content: content.find((item) => item.source_id === source.id)?.content ?? "" })),
  };
}
