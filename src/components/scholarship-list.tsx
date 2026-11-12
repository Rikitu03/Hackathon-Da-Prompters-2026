"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/http-client";
import type { ProgramSummary } from "@/lib/guides/data";
export function ScholarshipList() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setPrograms((await api<{ programs: ProgramSummary[] }>("/api/scholarships")).programs); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not load guides"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <><h1 className="text-4xl font-semibold">Scholarship preparation guides</h1><p className="mt-4 max-w-2xl leading-7 text-slate-600">Read published guidance, follow document preparation steps, and keep a checklist on this device. Submit applications through the official scholarship office.</p>
    <button className="mt-5 text-sm font-medium text-emerald-800 underline" onClick={load} disabled={loading}>Refresh guides</button>
    {loading && <p role="status" className="mt-8">Loading published guides…</p>}
    {error && <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {!loading && !error && !programs.length && <div className="mt-8 rounded-2xl border border-dashed border-emerald-300 bg-white p-8"><h2 className="font-semibold">No published guides yet</h2><p className="mt-3 text-sm leading-6 text-slate-600">The content team must review and publish a guide before it appears here. Drafts stay private.</p></div>}
    <div className="mt-8 grid gap-4 md:grid-cols-2">{programs.map((program) => <Link key={program.id} href={`/scholarships/${program.id}`} className="rounded-2xl border border-emerald-100 bg-white p-6 hover:border-emerald-500"><span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Published guide</span><h2 className="mt-3 text-xl font-semibold">{program.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{program.description}</p><p className="mt-5 text-sm font-medium text-emerald-800">{program.application_cycles.map((cycle) => cycle.academic_year).join(" · ")} →</p></Link>)}</div>
  </>;
}
