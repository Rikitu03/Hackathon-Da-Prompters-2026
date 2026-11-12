"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, ClipboardList, FilePenLine, LibraryBig, Plus, ShieldCheck } from "lucide-react";
import type { AdminData, Cycle, Program } from "./data";
import { formatDate, isHttpsLink } from "./data";
import type { Section } from "./console";

const route = (demoMode: boolean, section: Exclude<Section, "overview">, programId?: string) =>
  demoMode
    ? "/admin/demo?view=" + section + (programId ? "&program=" + encodeURIComponent(programId) : "")
    : section === "programs" && programId
      ? "/admin/programs/" + encodeURIComponent(programId)
      : "/admin/" + section;

const authoringSteps = [
  { section: "programs", title: "Guide details", description: "Scholarship and academic year" },
  { section: "requirements", title: "Required documents", description: "Steps and common questions" },
  { section: "knowledge", title: "Official references", description: "Sources and verification" },
  { section: "preview", title: "Review & publish", description: "Student preview and safety checks" },
] as const;

export function AdminWorkflow({ section, demoMode }: { section: Section; demoMode: boolean }) {
  if (section === "overview") return null;
  return (
    <nav className="mb-6" aria-label="Guide authoring workflow">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[#53657b]">Create a scholarship guide · 4 steps</p>
        <p className="text-xs text-[#53657b]">Choose a step to continue editing your draft</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {authoringSteps.map((step, index) => (
          <li key={step.section}>
            <Link
              href={route(demoMode, step.section)}
              aria-current={section === step.section ? "step" : undefined}
              className="admin-workflow-step flex min-h-20 items-center gap-3 rounded-xl border border-[#d7e3ef] bg-white p-3 text-[#102a51] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef6ff] text-sm font-bold text-[#155bb0]">{index + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="mt-0.5 block text-xs text-[#53657b]">{step.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

type Bar = { label: string; value: number; color: string };

function Distribution({ title, description, values }: { title: string; description: string; values: Bar[] }) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="rounded-2xl border border-[#d7e3ef] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-[#102a51]">{title}</h3>
      <p className="mt-1 text-xs text-[#53657b]">{description}</p>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#eef6ff]" role="img" aria-label={total === 0 ? title + ": no records" : values.map(v => v.label + " " + v.value).join(", ")}>
        {values.map(item => <span key={item.label} style={{width: total ? (item.value / total * 100) + "%" : "0%",backgroundColor:item.color}}/>)}
      </div>
      <ul className="mt-4 space-y-3">
        {values.map(item => (
          <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-[#53657b]"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{backgroundColor:item.color}}/>{item.label}</span>
            <span className="font-semibold tabular-nums text-[#102a51]">{item.value}<span className="ml-2 font-normal text-[#53657b]">{total ? Math.round(item.value / total * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
      {!total && <p className="mt-4 text-xs text-[#53657b]">No records yet. The chart will update when content is saved.</p>}
    </section>
  );
}

export function OperationsPanel({ data, demoMode }: { data: AdminData; demoMode: boolean }) {
  const guideCounts: Bar[] = [
    { label: "Published", value: data.programs.filter(p => p.status === "published").length, color: "#155bb0" },
    { label: "Draft", value: data.programs.filter(p => p.status === "draft").length, color: "#90bceb" },
    { label: "Archived", value: data.programs.filter(p => p.status === "archived").length, color: "#f7c744" },
  ];
  const sourceCounts: Bar[] = [
    { label: "Approved", value: data.sources.filter(s => s.is_approved).length, color: "#155bb0" },
    { label: "Awaiting review", value: data.sources.filter(s => !s.is_approved).length, color: "#f7c744" },
  ];
  const draftCycles = data.cycles.filter(c => c.status === "draft");
  const missingDocs = draftCycles.filter(c => !data.requirements.some(r => r.cycle_id === c.id));
  const missingLinks = draftCycles.filter(c => !c.official_url || !isHttpsLink(c.official_url));
  const pendingSources = data.sources.filter(s => !s.is_approved);
  const attention = [
    { title: "Draft cycles need document checklists", count: missingDocs.length, href: route(demoMode, "requirements"), icon: ClipboardList },
    { title: "Draft cycles need an official HTTPS link", count: missingLinks.length, href: route(demoMode, "programs"), icon: BookOpen },
    { title: "Sources awaiting verification", count: pendingSources.length, href: route(demoMode, "knowledge"), icon: LibraryBig },
  ];
  const firstDraft = data.programs.find(p => p.status === "draft");
  return (
    <div className="mt-6 space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#bcd6f0] bg-[#eef6ff] p-5 sm:p-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#155bb0]">Start here</p>
          <h2 className="mt-1 text-xl font-bold text-[#102a51]">Manage the scholarship guides students will see</h2>
          <p className="mt-1 text-sm leading-6 text-[#53657b]">Create a guide, add its required documents, verify official sources, then review it before publishing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={demoMode ? route(true,"programs") : "/admin/programs/new"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155bb0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#104a92]"><Plus size={17}/>Create guide</Link>
          {firstDraft && <Link href={route(demoMode,"programs",firstDraft.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b5c9e0] bg-white px-4 py-2.5 text-sm font-semibold text-[#102a51] hover:bg-[#eaf4ff]"><FilePenLine size={17}/>Continue draft</Link>}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2" aria-label="Content operation charts">
        <Distribution title="Scholarship guide status" description="Current guide records in the content library" values={guideCounts}/>
        <Distribution title="Official source reviews" description="Current source approval state; indexing is tracked separately" values={sourceCounts}/>
      </div>
      <section className="rounded-2xl border border-[#d7e3ef] bg-white p-5 sm:p-6" aria-labelledby="admin-needs-attention">
        <div className="flex flex-wrap items-center gap-2">
          <AlertCircle size={20} className="text-[#155bb0]"/>
          <h2 id="admin-needs-attention" className="text-lg font-semibold text-[#102a51]">Needs attention</h2>
        </div>
        <p className="mt-1 text-sm text-[#53657b]">These checks use saved content, not student activity. Select a task to open the relevant editor.</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {attention.map(item => (
            <li key={item.title}>
              <Link href={item.href} className="flex h-full min-h-28 flex-col gap-3 rounded-xl border border-[#d7e3ef] p-4 transition-colors hover:border-[#8eb5e1] hover:bg-[#f6fbff]">
                <div className="flex items-center justify-between">
                  <item.icon size={20} className="text-[#155bb0]"/>
                  <span className="text-xl font-bold tabular-nums text-[#102a51]">{item.count}</span>
                </div>
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-[#102a51]">{item.title}<ArrowRight size={16} aria-hidden="true"/></span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-xs text-[#53657b]"><ShieldCheck size={15} className="shrink-0 text-[#155bb0]"/>Final publishing also requires approved dated sources, indexing, and server authorization; these cards are not a publish-ready certification.</p>
      </section>
    </div>
  );
}

/** Draft rendition of the actual published-guide fields used by Member 1. */
export function ApplicantContentPreview({ data, program, cycle }: { data: AdminData; program: Program | undefined; cycle: Cycle }) {
  const requirements = data.requirements.filter(r => r.cycle_id === cycle.id).sort((a,b) => a.position - b.position);
  const sources = data.sources.filter(s => s.cycle_id === cycle.id);
  return (
    <div className="admin-applicant-preview space-y-5" aria-label="Applicant content preview">
      <div className="rounded-xl bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#155bb0]">Applicant guide · draft rendition</p>
        <h3 className="mt-2 text-2xl font-bold">{program?.title ?? "Scholarship guide"}</h3>
        <p className="mt-2 text-sm leading-6 text-[#53657b]">{program?.description || "No guide description entered yet."}</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[#d7e3ef] pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-[#53657b]">Academic year / cycle</dt><dd className="font-semibold text-[#102a51]">{cycle.academic_year}</dd></div>
          <div><dt className="text-[#53657b]">Application dates</dt><dd className="font-semibold text-[#102a51]">{cycle.application_start || cycle.application_end ? formatDate(cycle.application_start) + " – " + formatDate(cycle.application_end) : "Not yet published"}</dd></div>
        </dl>
        {cycle.official_url && isHttpsLink(cycle.official_url)
          ? <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#155bb0] underline underline-offset-4" href={cycle.official_url} target="_blank" rel="noopener noreferrer">Official application portal <ArrowRight size={16}/></a>
          : <p className="mt-3 text-sm text-[#8c5f22]">Official application URL is missing or invalid.</p>}
      </div>
      <section aria-labelledby="student-checklist-heading">
        <h4 id="student-checklist-heading" className="mb-3 text-lg font-semibold">Documents to prepare</h4>
        {requirements.length === 0 ? <p className="rounded-xl border border-dashed border-[#d7e3ef] bg-white p-4 text-sm text-[#53657b]">Add required documents before students can use a meaningful checklist.</p> : (
          <ol className="space-y-3">
            {requirements.map((r,i) => {
              const steps = data.steps.filter(s => s.requirement_id === r.id).sort((a,b)=>a.position-b.position);
              const faqs = data.faqs.filter(f => f.requirement_id === r.id);
              return (
                <li key={r.id} className="rounded-xl border border-[#d7e3ef] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><h5 className="font-semibold text-[#102a51]">{i+1}. {r.title}</h5><span className="text-xs text-[#53657b]">{r.is_required ? "Required" : "Conditional"}</span></div>
                  <p className="mt-2 text-sm leading-6 text-[#53657b]">{r.description}</p>
                  <h6 className="mt-3 text-sm font-semibold text-[#102a51]">How to prepare</h6>
                  {steps.length ? <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#294e70]">{steps.map(step=><li key={step.id}>{step.instruction}</li>)}</ol>
                    : <p className="mt-1 text-sm text-[#8c5f22]">Preparation steps are missing.</p>}
                  {faqs.length > 0 && <div className="mt-4 space-y-2">
                    <h6 className="text-sm font-semibold text-[#102a51]">Questions you might have</h6>
                    {faqs.map(faq=><details key={faq.id}><summary>{faq.question}</summary><p className="text-sm text-[#53657b]">{faq.answer}</p></details>)}
                  </div>}
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold"><LibraryBig size={18} className="text-[#155bb0]"/>Official references</h4>
        {sources.length ? <ul className="space-y-2">
          {sources.map(source => <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm">
            <span className="font-medium text-[#102a51]">{source.title}</span>
            <span className="text-xs text-[#53657b]">{source.is_approved ? "Approved" : "Not yet approved"} · {source.reviewed_at ? "Reviewed " + formatDate(source.reviewed_at.slice(0,10)) : "Review date missing"}</span>
          </li>)}
        </ul> : <p className="rounded-xl bg-white p-4 text-sm text-[#53657b]">No sources attached. Applicants must be directed to the official portal for confirmation.</p>}
      </section>
      <p className="text-xs leading-5 text-[#53657b]"><CheckCircle2 size={14} className="mr-1 inline align-[-2px] text-[#155bb0]"/>This preview uses the real saved draft fields and applicant-facing terms. It does not bypass publication approval or expose the draft through the public API. Student progress stays private in each browser.</p>
    </div>
  );
}
