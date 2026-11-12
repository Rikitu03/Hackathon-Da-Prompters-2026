import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "editor" | "publisher";
export type Program = { id: string; title: string; description: string; status: "draft" | "published" | "archived"; created_at: string };
export type Cycle = { id: string; program_id: string; academic_year: string; application_start: string | null; application_end: string | null; official_url: string | null; status: "draft" | "published" | "archived"; published_at: string | null };
export type Requirement = { id: string; cycle_id: string; title: string; description: string; is_required: boolean; position: number };
export type Step = { id: string; requirement_id: string; instruction: string; position: number };
export type FAQ = { id: string; requirement_id: string; question: string; answer: string };
export type Source = { id: string; cycle_id: string; title: string; source_url: string | null; reviewed_at: string | null; content_version: number; is_approved: boolean };
export type AdminData = { programs: Program[]; cycles: Cycle[]; requirements: Requirement[]; steps: Step[]; faqs: FAQ[]; sources: Source[] };
export const emptyData: AdminData = { programs: [], cycles: [], requirements: [], steps: [], faqs: [], sources: [] };

export function isHttpsLink(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname); } catch { return false; }
}

export async function loadAdminData(client: SupabaseClient): Promise<AdminData> {
  const [p, c, r, s, f, k] = await Promise.all([
    client.from("scholarship_programs").select("id,title,description,status,created_at").order("created_at", { ascending: false }),
    client.from("application_cycles").select("id,program_id,academic_year,application_start,application_end,official_url,status,published_at"),
    client.from("requirements").select("id,cycle_id,title,description,is_required,position").order("position"),
    client.from("requirement_steps").select("id,requirement_id,instruction,position").order("position"),
    client.from("faqs").select("id,requirement_id,question,answer"),
    client.from("knowledge_sources").select("id,cycle_id,title,source_url,reviewed_at,content_version,is_approved")
  ]);
  const error = [p.error, c.error, r.error, s.error, f.error, k.error].find(Boolean);
  if (error) throw new Error(error.message);
  return {
    programs: (p.data || []) as Program[],
    cycles: (c.data || []) as Cycle[],
    requirements: (r.data || []) as Requirement[],
    steps: (s.data || []) as Step[],
    faqs: (f.data || []) as FAQ[],
    sources: (k.data || []) as Source[]
  };
}

export function formatDate(value: string | null): string {
  if (!value) return "Not specified";
  const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
