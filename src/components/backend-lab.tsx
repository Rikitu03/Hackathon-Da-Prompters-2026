"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/http-client";
import type { GuideDocument, GuideDraft } from "@/lib/guides/schema";
import type { ProgramSummary } from "@/lib/guides/data";

const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm disabled:bg-slate-100";
const button = "rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const outline = "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40";
const sample: GuideDraft = {
  title: "DEMO — Scholarship preparation guide", description: "Synthetic test content only. This is not an official scholarship announcement.",
  academicYear: "Demo cycle", applicationStart: "2026-11-01", applicationEnd: "2026-12-01", officialUrl: "https://example.com/demo-application",
  requirements: [{ title: "DEMO — Example document", description: "An invented requirement used only to test the preparation flow.", required: true,
    steps: ["Read the practice instructions.", "Prepare a synthetic example document."], faqs: [{ question: "Is this an official requirement?", answer: "No. This is synthetic test content." }] }],
  sources: [{ title: "DEMO — Practice reference", url: "https://example.com/demo-source", content: "Synthetic reference text for testing only. The example document is an invented requirement, not official scholarship guidance.", approved: false }],
};
type Session = { user: { id: string; email: string }; role: "editor" | "publisher" };
type Summary = { id: string; status: string; academic_year: string; scholarship_programs: { title: string; status: string } };
type Result = { label: string; ok: boolean; content: unknown };
export function BackendLab() {
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState<GuideDraft>(() => structuredClone(sample));
  const [guides, setGuides] = useState<Summary[]>([]);
  const [published, setPublished] = useState<ProgramSummary[]>([]);
  const [status, setStatus] = useState("Unsaved example");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [health, setHealth] = useState("Checking database…");
  const [simulation, setSimulation] = useState(0);
  async function refreshPublic() { const data = await api<{ programs: ProgramSummary[] }>("/api/scholarships"); setPublished(data.programs); }
  async function refreshGuides() { const data = await api<{ guides: Summary[] }>("/api/admin/guides"); setGuides(data.guides); }
  async function load(id: string) {
    const { guide } = await api<{ guide: GuideDocument }>(`/api/admin/guides/${id}`);
    const { status: guideStatus, ...document } = guide;
    setDraft(document); setStatus(guideStatus); setDirty(false);
  }
  useEffect(() => {
    void (async () => {
      try { await refreshPublic(); const data = await api<{ database: { connected: boolean } }>("/api/health"); setHealth(data.database.connected ? "Database connected" : "Database unavailable"); }
      catch { setHealth("Database unavailable — check the server and environment values"); }
      try { const current = await api<Session>("/api/auth/session"); setSession(current); await refreshGuides(); }
      catch { /* The public walkthrough works without an administrator session. */ }
    })();
  }, []);
  async function run(label: string, work: () => Promise<unknown>) {
    setBusy(true);
    try { const content = await work(); setResult({ label, ok: true, content }); }
    catch (error) { setResult({ label, ok: false, content: error instanceof Error ? error.message : "Request failed" }); }
    finally { setBusy(false); }
  }
  function edit(values: Partial<GuideDraft>) { setDraft((current) => ({ ...current, ...values })); setDirty(true); }
  function requirement(index: number, values: Partial<GuideDraft["requirements"][number]>) {
    edit({ requirements: draft.requirements.map((item, i) => i===index ? { ...item, ...values } : item) });
  }
  function source(index: number, values: Partial<GuideDraft["sources"][number]>) {
    edit({ sources: draft.sources.map((item, i) => i===index ? { ...item, approved: false, ...values } : item) });
  }
  const canWrite = session?.role === "publisher";
  return <>
    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Development walkthrough</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">See the backend work.</h1>
    <p className="mt-4 max-w-3xl leading-7 text-slate-600">The backend stores reviewed scholarship guides and controls who can publish them. This simple page lets you try the same APIs the final frontend will use.</p>
    <p role="status" className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-medium">● {health}</p>

    <section className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5">
      <h2 className="font-semibold">1. Understand the flow</h2>
      <p className="mt-2 text-sm text-slate-600">Click through this explanation. These three buttons are a simulation; the forms below make real database changes.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{["Draft saved", "Source reviewed", "Guide published"].map((step, index) => <button key={step} onClick={() => setSimulation(index)} aria-pressed={simulation===index} className={`rounded-xl border p-4 text-left text-sm ${simulation===index ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><span className="block font-semibold">{index+1}. {step}</span><span className="mt-2 block text-slate-600">{["Only administrators see it.", "A human checks the reference.", "Applicants can read the guide."][index]}</span></button>)}</div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><strong>Applicant view:</strong> {simulation===2 ? "The published guide, preparation steps, FAQs, and source links are visible." : "This guide stays hidden. Saving a draft or approving a source alone does not publish it."}</div>
    </section>

    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">2. Sign in as an administrator</h2>
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">Development test login: <strong>dev-admin@gabayiskolar.test</strong>. Open the private <code>.env.seed.local</code> file on this computer and copy <code>SEED_ADMIN_PASSWORD</code>. After signing in, select a saved DEMO guide below.</p>
          {session ? <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span>{session.user.email} · <strong>{session.role}</strong></span><button className={outline} disabled={busy} onClick={() => run("POST /api/auth/logout", async () => { const data = await api("/api/auth/logout", { method: "POST" }); setSession(null); setGuides([]); return data; })}>Sign out</button></div> : <form className="mt-4 space-y-3" onSubmit={(event) => {
            event.preventDefault(); void run("POST /api/auth/login", async () => { const data = await api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); setSession(data); setPassword(""); await refreshGuides(); return { signedIn: true, role: data.role }; });
          }}><label className="block text-sm">App account email<input required type="email" autoComplete="username" className={input} value={email} onChange={(e) => setEmail(e.target.value)}/></label><label className="block text-sm">Password<input required type="password" autoComplete="current-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)}/></label><button className={button} disabled={busy}>Sign in</button></form>}
          <details className="mt-4 text-sm leading-6 text-slate-600"><summary className="cursor-pointer font-medium text-emerald-900">No application account yet?</summary><ol className="mt-3 list-inside list-decimal space-y-2"><li>Open Supabase → Authentication → Users. Create your own email/password user using the dashboard. Confirm the email there for this development account.</li><li>Copy its user UUID, then run the SQL below in the SQL editor.</li><li>Return here and sign in. Your dashboard login is separate from this app account.</li></ol><pre className="mt-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs">{"insert into public.admin_profiles (user_id, role)\nvalues ('REPLACE_WITH_YOUR_AUTH_USER_UUID', 'publisher');"}</pre><a className="mt-2 inline-block text-emerald-800 underline" href="https://supabase.com/dashboard/project/jchbbechdldfcyralrln/auth/users" target="_blank" rel="noreferrer">Open shared project users ↗</a></details>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">3. Save, review, and publish a guide</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium">{dirty ? "Unsaved changes" : status}</span></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">The prefilled example is synthetic. It is not saved until you click Save draft. Real actions below affect the shared development database.</p>
          {session && <label className="mt-4 block text-sm">Open a saved guide<select className={input} disabled={busy} value={draft.cycleId ?? ""} onChange={(e) => { const id = e.target.value; if (id && window.confirm("Load this guide and discard unsaved form changes?")) void run("GET /api/admin/guides/:id", async () => { await load(id); return { loaded: id }; }); }}><option value="">New example</option>{guides.map((guide) => <option key={guide.id} value={guide.id}>{guide.scholarship_programs.title} · {guide.academic_year}</option>)}</select></label>}
          <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void run("POST /api/admin/guides", async () => {
            const document = { ...draft, requirements: draft.requirements.map((item) => ({ ...item, steps: item.steps.map((step) => step.trim()).filter(Boolean) })) };
            const data = await api<{ guide: { cycleId: string } }>("/api/admin/guides", { method: "POST", body: JSON.stringify(document) });
            await load(data.guide.cycleId); await refreshGuides(); await refreshPublic(); return data;
          }); }}>
            <fieldset disabled={busy || !canWrite} className="space-y-4">
              <label className="block text-sm">Scholarship name<input required className={input} value={draft.title} onChange={(e) => edit({ title: e.target.value })}/></label>
              <label className="block text-sm">Description<textarea className={input} value={draft.description} onChange={(e) => edit({ description: e.target.value })}/></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Academic year<input required className={input} value={draft.academicYear} onChange={(e) => edit({ academicYear: e.target.value })}/></label><label className="text-sm">Official application URL<input type="url" className={input} value={draft.officialUrl} onChange={(e) => edit({ officialUrl: e.target.value })}/></label><label className="text-sm">Opens<input type="date" className={input} value={draft.applicationStart} onChange={(e) => edit({ applicationStart: e.target.value })}/></label><label className="text-sm">Closes<input type="date" className={input} value={draft.applicationEnd} onChange={(e) => edit({ applicationEnd: e.target.value })}/></label></div>
              <div className="border-t pt-4"><h3 className="text-sm font-semibold">Requirements</h3>{draft.requirements.map((item, index) => <div key={item.id ?? index} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3"><label className="block text-sm">Document {index+1}<input required className={input} value={item.title} onChange={(e) => requirement(index, { title: e.target.value })}/></label><label className="block text-sm">Description<textarea className={input} value={item.description} onChange={(e) => requirement(index, { description: e.target.value })}/></label><label className="block text-sm">Preparation steps · one per line<textarea rows={3} className={input} value={item.steps.join("\n")} onChange={(e) => requirement(index, { steps: e.target.value.split("\n") })}/></label><button type="button" className="text-xs text-red-700 underline" onClick={() => edit({ requirements: draft.requirements.filter((_, i) => i!==index) })}>Remove requirement</button></div>)}<button className={`${outline} mt-3`} type="button" onClick={() => edit({ requirements: [...draft.requirements, { title: "", description: "", required: true, steps: [], faqs: [] }] })}>+ Requirement</button></div>
              <div className="border-t pt-4"><h3 className="text-sm font-semibold">Sources</h3>{draft.sources.map((item, index) => <div key={item.id ?? index} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3"><label className="block text-sm">Source title<input required className={input} value={item.title} onChange={(e) => source(index, { title: e.target.value })}/></label><label className="block text-sm">Reference URL<input type="url" className={input} value={item.url} onChange={(e) => source(index, { url: e.target.value })}/></label><label className="block text-sm">Reference text<textarea rows={4} className={input} value={item.content} onChange={(e) => source(index, { content: e.target.value })}/></label><label className="flex items-start gap-2 text-sm leading-6"><input className="mt-1" type="checkbox" checked={item.approved} onChange={(e) => source(index, { approved: e.target.checked })}/>I have reviewed this source. For the synthetic example, this only approves test data.</label><button type="button" className="text-xs text-red-700 underline" onClick={() => edit({ sources: draft.sources.filter((_, i) => i!==index) })}>Remove source</button></div>)}<button className={`${outline} mt-3`} type="button" onClick={() => edit({ sources: [...draft.sources, { title: "", url: "", content: "", approved: false }] })}>+ Source</button></div>
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Saving returns this program to draft, including hiding its other cycles until the program is published again. Editing a source clears its approval. Save again after checking the review box.</p>
              <button className={button}>Save draft</button>
            </fieldset>
          </form>
          {!canWrite && <p className="mt-4 text-sm text-amber-800">{session ? "Editors can inspect guides. Publisher access is required to save or publish." : "Sign in as a publisher to enable real database actions. You can explore the flow above without signing in."}</p>}
          <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || !canWrite || !draft.cycleId || dirty} className={button} onClick={() => run("POST /api/admin/publish", async () => { const data = await api("/api/admin/publish", { method: "POST", body: JSON.stringify({ cycleId: draft.cycleId }) }); await load(draft.cycleId!); await refreshGuides(); await refreshPublic(); return data; })}>Publish guide</button><button disabled={busy || !canWrite || !draft.cycleId || dirty} className={outline} onClick={() => run("Return guide to draft", async () => { const data = await api("/api/admin/publish", { method: "POST", body: JSON.stringify({ cycleId: draft.cycleId, publish: false }) }); await load(draft.cycleId!); await refreshPublic(); await refreshGuides(); return data; })}>Unpublish</button><button className={outline} disabled={busy} onClick={() => { if (window.confirm("Discard unsaved changes and start a new synthetic example?")) { setDraft(structuredClone(sample)); setStatus("Unsaved example"); setDirty(true); } }}>New example</button></div>
          {draft.programId && <button className="mt-4 text-xs text-red-700 underline disabled:opacity-40" disabled={busy || !canWrite} onClick={() => { if (window.confirm("Delete this program and ALL its cycles and sources from the shared development database?")) void run("DELETE /api/admin/programs/:id", async () => { const data = await api(`/api/admin/programs/${draft.programId}`, { method: "DELETE" }); setDraft(structuredClone(sample)); setStatus("Unsaved example"); setDirty(true); await refreshGuides(); await refreshPublic(); return data; }); }}>Delete this program and its content</button>}
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-5">
        <section className="rounded-2xl border border-emerald-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">4. Public result</h2><button className="text-sm underline" disabled={busy} onClick={() => run("GET /api/scholarships", async () => { await refreshPublic(); return { refreshed: true }; })}>Refresh</button></div><p className="mt-3 text-sm leading-6 text-slate-600">This request always uses anonymous permissions, even while you are signed in. Drafts must stay hidden.</p>{!published.length ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No published guides. Save and publish a reviewed guide to see it here.</div> : <div className="mt-4 space-y-3">{published.map((program) => <Link key={program.id} href={`/scholarships/${program.id}`} className="block rounded-xl border border-emerald-100 p-4 hover:bg-emerald-50"><strong className="text-sm">{program.title}</strong><p className="mt-1 text-xs text-slate-500">{program.application_cycles.map((cycle) => cycle.academic_year).join(", ")} → Open applicant view</p></Link>)}</div>}<Link href="/scholarships" target="_blank" className="mt-5 inline-block text-sm font-medium text-emerald-800 underline">Open public page in another tab ↗</Link></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Last API result</h2><div aria-live="polite" className={`mt-3 rounded-lg p-3 text-sm ${result?.ok===false ? "bg-red-50 text-red-800" : "bg-slate-50"}`}>{result ? <><p className="font-medium">{result.ok ? "✓ Success" : "Request failed"} · {result.label}</p><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(result.content, null, 2)}</pre></> : "Try a real action to see its server response here."}</div><details className="mt-4 text-sm"><summary className="cursor-pointer text-emerald-800 underline">View the draft JSON sent to the backend</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(draft, null, 2)}</pre></details></section>
        <section className="rounded-2xl bg-emerald-900 p-5 text-emerald-50"><h2 className="font-semibold">Why no applicant table?</h2><p className="mt-3 text-sm leading-6">Students read public guidance and keep a preparation checklist in their own browser. They do not submit scholarship applications here. Applicant profiles and saved checklist rows become necessary if we add student sign-in and syncing across devices.</p></section>
      </aside>
    </div>
  </>;
}
