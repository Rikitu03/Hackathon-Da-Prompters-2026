import type { AdminData, Program, Cycle, Requirement, Source } from "./data";
import { demoData } from "./demo-data";

/**
 * Presentation-only workspace. Never accesses live admin APIs or Supabase.
 * All identifiers are fictional and browser data is scoped to this tab.
 */
export const DEMO_STORE_KEY = "gabayiskolar-admin-demo-sandbox-v1";

export function readDemoSandbox(): AdminData {
  if (typeof window === "undefined") return demoData;
  try {
    const raw = window.sessionStorage.getItem(DEMO_STORE_KEY);
    if (!raw) return demoData;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return demoData;
    const candidate = value as Record<string, unknown>;
    const keys: Array<keyof AdminData> = ["programs", "cycles", "requirements", "steps", "faqs", "sources"];
    if (!keys.every(key => Array.isArray(candidate[key]) &&
      (candidate[key] as unknown[]).every(row => row && typeof row === "object"))) return demoData;
    return candidate as AdminData;
  } catch { return demoData; }
}

export function writeDemoSandbox(data: AdminData) {
  try { window.sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(data)); }
  catch { /* Storage might be unavailable; in-memory demo remains usable. */ }
}

export function clearDemoSandbox() {
  try { window.sessionStorage.removeItem(DEMO_STORE_KEY); } catch { /* no persistent storage */ }
}

export function demoId(type: string) {
  return "demo-" + type + "-" + crypto.randomUUID();
}

export function upsertDemoProgram(data: AdminData, program: Program): AdminData {
  return {...data, programs: data.programs.some(row => row.id === program.id)
    ? data.programs.map(row => row.id === program.id ? program : row)
    : [...data.programs, program]};
}

export function upsertDemoCycle(data: AdminData, cycle: Cycle): AdminData {
  return {...data, cycles: data.cycles.some(row => row.id === cycle.id)
    ? data.cycles.map(row => row.id === cycle.id ? cycle : row)
    : [...data.cycles, cycle]};
}

export function upsertDemoRequirement(
  data: AdminData, requirement: Requirement, instructions: string[],
  faqs: Array<{question: string; answer: string}>
): AdminData {
  const existing = data.requirements.some(row => row.id === requirement.id);
  return {
    ...data,
    requirements: existing
      ? data.requirements.map(row => row.id === requirement.id ? requirement : row)
      : [...data.requirements, requirement],
    steps: [
      ...data.steps.filter(row => row.requirement_id !== requirement.id),
      ...instructions.map((instruction, position) => ({
        id: demoId("step"), requirement_id: requirement.id, instruction, position,
      })),
    ],
    faqs: [
      ...data.faqs.filter(row => row.requirement_id !== requirement.id),
      ...faqs.map(item => ({
        id: demoId("faq"), requirement_id: requirement.id, ...item,
      })),
    ],
  };
}

export function upsertDemoSource(data: AdminData, source: Source): AdminData {
  return {...data, sources: data.sources.some(row => row.id === source.id)
    ? data.sources.map(row => row.id === source.id ? source : row)
    : [...data.sources, source]};
}
