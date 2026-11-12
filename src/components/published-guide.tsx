"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/http-client";
import type { PublicProgram, PublicCycle } from "@/lib/guides/data";

function Checklist({ cycle }: { cycle: PublicCycle }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const key = `gabayiskolar:checklist:${cycle.id}`;
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(value)) setChecked(value.filter((id): id is string => typeof id==="string" && cycle.requirements.some((requirement) => requirement.id===id)));
    } catch { setStorageError(true); }
    setReady(true);
  }, [key, cycle.requirements]);
  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((value) => value!==id) : [...checked, id];
    setChecked(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { setStorageError(true); }
  }
  return <><div className="mt-8 rounded-xl bg-emerald-50 p-4 text-sm"><strong>{checked.length} of {cycle.requirements.length} prepared.</strong> Checklist progress is stored only in this browser.</div>
    {storageError && <p className="mt-3 text-sm text-amber-800">Browser storage is unavailable. Your checklist may reset when you leave.</p>}
    <div className="mt-5 space-y-4">{[...cycle.requirements].sort((a,b) => a.position-b.position).map((requirement) => <article key={requirement.id} className="rounded-2xl border border-slate-200 bg-white p-5"><label className="flex items-start gap-3"><input type="checkbox" disabled={!ready} checked={checked.includes(requirement.id)} onChange={() => toggle(requirement.id)} className="mt-1 h-5 w-5 accent-emerald-700"/><span><strong className="text-lg">{requirement.title}</strong><span className="ml-3 text-xs text-slate-500">{requirement.is_required ? "Required" : "Optional"}</span></span></label><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{requirement.description}</p><ol className="mt-4 list-inside list-decimal space-y-2 text-sm leading-6">{[...requirement.requirement_steps].sort((a,b) => a.position-b.position).map((step) => <li key={step.id}>{step.instruction}</li>)}</ol>{requirement.faqs.map((faq) => <details key={faq.id} className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-medium">{faq.question}</summary><p className="mt-2 leading-6">{faq.answer}</p></details>)}</article>)}</div>
  </>;
}
export function PublishedGuide({ id }: { id: string }) {
  const [program, setProgram] = useState<PublicProgram | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setProgram(null); setError("");
    void api<{ program: PublicProgram }>(`/api/scholarships/${id}`).then((data) => {
      if (alive) { setProgram(data.program); setCycleId(data.program.application_cycles[0]?.id ?? ""); }
    }).catch((failure) => { if (alive) setError(failure.message); });
    return () => { alive = false; };
  }, [id]);
  if (error) return <p role="alert" className="rounded-xl bg-amber-50 p-5">{error} <Link className="underline" href="/scholarships">Browse published guides</Link></p>;
  if (!program) return <p role="status">Loading guide…</p>;
  const cycle = program.application_cycles.find((item) => item.id===cycleId);
  return <div className="mx-auto max-w-3xl"><Link href="/scholarships" className="text-sm text-emerald-800 underline">← All guides</Link><h1 className="mt-5 text-4xl font-semibold">{program.title}</h1><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">{program.description}</p>
    {program.title.startsWith("DEMO") && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Synthetic development example. These dates, requirements, and sources are not official scholarship guidance.</p>}
    <div className="mt-6 flex flex-wrap gap-2">{program.application_cycles.map((item) => <button key={item.id} onClick={() => setCycleId(item.id)} aria-pressed={cycleId===item.id} className={`rounded-full border px-4 py-2 text-sm ${cycleId===item.id ? "bg-emerald-800 text-white" : "bg-white"}`}>{item.academic_year}</button>)}</div>
    {cycle ? <><p className="mt-4 text-sm text-slate-600">Application dates: {cycle.application_start} – {cycle.application_end}</p><Checklist key={cycle.id} cycle={cycle}/><section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Reviewed references</h2><ul className="mt-3 space-y-2 text-sm">{cycle.knowledge_sources.map((source) => <li key={source.id}>{source.source_url?.startsWith("https://") ? <a href={source.source_url} target="_blank" rel="noreferrer" className="text-emerald-800 underline">{source.title} ↗</a> : source.title}</li>)}</ul></section>{cycle.official_url?.startsWith("https://") && <a className="mt-6 inline-block rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white" href={cycle.official_url} target="_blank" rel="noreferrer">Continue to the official application site ↗</a>}</> : <p className="mt-8">No published application cycles are available.</p>}
  </div>;
}
