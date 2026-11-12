"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight, BookOpenCheck, Check, ChevronRight, ClipboardCheck, ExternalLink, FileCheck2, FileText, GraduationCap,
  LayoutDashboard, LibraryBig, LoaderCircle, LockKeyhole, LogOut, Plus, RefreshCw,
  ShieldCheck, X
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabaseClient } from "@/lib/supabase/client";
import { Button, Card, Empty, Field, Heading, Notice, Pill, StepLink, inputClass, areaClass } from "./ui";
import { emptyData, formatDate, isHttpsLink, loadAdminData, type AdminData, type Cycle, type Program, type Requirement, type Role } from "./data";
import { demoData } from "./demo-data";
import { AdminSelect } from "./select";
import { StepBuilder } from "./step-builder";
import { AutoTextarea } from "./auto-textarea";
import { FaqAccordion } from "./faq-accordion";
import { ProgramSearch } from "./program-search";
import "./admin.css";

export type Section = "overview" | "programs" | "requirements" | "knowledge" | "preview";
const menu = [
  { id: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { id: "programs", label: "Scholarships", href: "/admin/programs", icon: GraduationCap },
  { id: "requirements", label: "Requirements", href: "/admin/requirements", icon: ClipboardCheck },
  { id: "knowledge", label: "Knowledge sources", href: "/admin/knowledge", icon: LibraryBig },
  { id: "preview", label: "Preview & publish", href: "/admin/preview", icon: FileCheck2 }
] as const;
const info: Record<Section, { label: string; description: string }> = {
  overview: { label: "Overview", description: "Your workspace for source-backed scholarship content." },
  programs: { label: "Scholarship programs", description: "Create and maintain program and academic-year drafts." },
  requirements: { label: "Requirement builder", description: "Give applicants a clear, verified document journey." },
  knowledge: { label: "Knowledge sources", description: "Keep reference material traceable and reviewed." },
  preview: { label: "Preview & publish", description: "Check readiness before sending content to the official publication workflow." }
};
const initProgram = { title: "", description: "" };
const initCycle = { academic_year: "", application_start: "", application_end: "", official_url: "" };
type FAQDraft = { question: string; answer: string };
type RequirementDraft = { title: string; description: string; is_required: boolean; steps: string[]; faqs: FAQDraft[] };
const initRequirement = (): RequirementDraft => ({ title: "", description: "", is_required: true, steps: [""], faqs: [] });
const errorText = (err: unknown) => err instanceof Error ? err.message : "Something went wrong. Please retry.";
const stat = (value: number, title: string, icon: ReactNode, subtitle: string, delay = 0) => <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.26,delay,ease:[0.22,1,0.36,1]}} className="h-full"><Card className="h-full"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-[#597768]">{title}</span><span className="rounded-xl bg-[#ecf5ef] p-2 text-[#28684b]">{icon}</span></div><p className="mt-3 text-3xl font-semibold tracking-tight text-[#163d2f]" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p><p className="mt-1 text-xs leading-5 text-[#586f60]">{subtitle}</p></Card></motion.div>;

function LinkNav({ section, mobile = false, demoMode = false }: { section: Section; mobile?: boolean; demoMode?: boolean }) {
  return <nav aria-label="Admin sections" className={mobile ? "flex min-w-max gap-1 px-3 py-2" : "space-y-1"}>
    {menu.map((item) => {
      const Icon = item.icon;
      return <Link key={item.id} href={demoMode ? "/admin/demo?view=" + item.id : item.href} aria-current={section === item.id ? "page" : undefined} className={(mobile ? "min-h-12 whitespace-nowrap px-3 " : "min-h-12 px-3 ") + "group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176448] " + (section === item.id ? "bg-[#e5f1e8] text-[#155a3d]" : "text-[#5b7268] hover:bg-[#f0f5f1] hover:text-[#183e2f]")}><Icon size={19} aria-hidden="true" className="shrink-0 transition-transform duration-150 group-hover:scale-105"/>{item.label}</Link>;
    })}
  </nav>;
}
function SelectScope({ data, programId, cycleId, onProgram, onCycle }: { data: AdminData; programId: string; cycleId: string; onProgram: (id: string) => void; onCycle: (id: string) => void }) {
  const cycles = data.cycles.filter((c) => c.program_id === programId);
  return <Card className="mb-5 !p-4"><div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
    <Field htmlFor="scope-program" label="Scholarship program"><AdminSelect id="scope-program" value={programId} onChange={(id) => {onProgram(id); onCycle("");}} placeholder="Choose a program" options={data.programs.map(p=>({value:p.id,label:p.title}))}/></Field>
    <Field htmlFor="scope-cycle" label="Application cycle"><AdminSelect id="scope-cycle" value={cycleId} onChange={onCycle} placeholder="Choose a cycle" options={cycles.map(c=>({value:c.id,label:c.academic_year+" — "+c.status}))} disabled={!programId}/></Field>
  </div></Card>;
}

export function AdminConsole({ section = "overview", programId: initialProgramId = "", startCreateProgram = false, demoMode = false }: { section?: Section; programId?: string; startCreateProgram?: boolean; demoMode?: boolean }) {
  const client = useMemo(() => { if (demoMode) return null; try {return createPublicSupabaseClient();} catch {return null;} }, [demoMode]);
  const [gate, setGate] = useState<"loading"|"setup"|"login"|"denied"|"ready"|"error">(demoMode ? "ready" : "loading");
  const [role, setRole] = useState<Role | null>(demoMode ? "editor" : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData>(demoMode ? demoData : emptyData);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [programId, setProgramId] = useState(initialProgramId);
  const [cycleId, setCycleId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [programMode, setProgramMode] = useState<"none"|"new"|"edit">(startCreateProgram ? "new" : "none");
  const [programForm, setProgramForm] = useState(initProgram);
  const [cycleMode, setCycleMode] = useState<"none"|"new"|"edit">("none");
  const [cycleForm, setCycleForm] = useState(initCycle);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [requirementForm, setRequirementForm] = useState<RequirementDraft>(initRequirement);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const reload = useCallback(async (sb: SupabaseClient) => {
    const rows = await loadAdminData(sb);
    setData(rows);
  }, []);
  const authenticate = useCallback(async () => {
    if (!client) { setGate("setup"); return; }
    setGate("loading");
    try {
      const {data: {user}, error: authError} = await client.auth.getUser();
      if (authError || !user) { setRole(null); setGate("login"); return; }
      const {data: profile, error: profileError} = await client.from("admin_profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== "editor" && profile?.role !== "publisher") { setRole(null); setGate("denied"); return; }
      setRole(profile.role as Role);
      await reload(client);
      setGate("ready");
      setError("");
    } catch (err) { setError(errorText(err)); setGate("error"); }
  }, [client, reload]);
  useEffect(() => { if (!demoMode) void authenticate(); }, [authenticate, demoMode]);
  // Keep the existing content visible while fetching updates; never blank the dashboard.
  useEffect(() => {
    if (!client || demoMode || gate !== "ready") return;
    let stopped = false;
    let running = false;
    const staleMessage = "Background sync failed. Showing the last loaded data. Changes from other admins may not be visible yet.";
    const refresh = async () => {
      if (stopped || running || document.visibilityState === "hidden") return;
      running = true;
      try {
        await reload(client);
        if (!stopped) setError(previous => previous === staleMessage ? "" : previous);
      } catch {
        if (!stopped) setError(staleMessage);
      } finally { running = false; }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [client, demoMode, gate, reload]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setError("");
    const {error: authError} = await client.auth.signInWithPassword({ email: email.trim(), password });
    setPassword("");
    if (authError) { setError("Sign-in failed. Check your credentials and try again."); setBusy(false); return; }
    await authenticate(); setBusy(false);
  }
  async function signOut() {
    if (demoMode || !client) return;
    await client.auth.signOut();
    try { sessionStorage.removeItem("gabayiskolar-admin-recent-searches-v1"); } catch { /* session storage unavailable */ }
    setData(emptyData); setRole(null); setGate("login"); setError(""); setMessage("");
  }
  async function act(action: (sb: SupabaseClient) => Promise<void>, success: string) {
    if (demoMode) { setError("Preview mode: changes are not saved. Sign in to the real admin workspace to make edits."); return; }
    if (!client) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(client); await reload(client); setMessage(success); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  const activeProgramId = programId || data.programs[0]?.id || "";
  const activeProgram = data.programs.find((p) => p.id === activeProgramId);
  const programCycles = data.cycles.filter((c) => c.program_id === activeProgramId);
  const activeCycleId = cycleId || programCycles[0]?.id || "";
  const activeCycle = programCycles.find((c) => c.id === activeCycleId);
  const cycleRequirements = data.requirements.filter((r) => r.cycle_id === activeCycleId);
  const cycleSources = data.sources.filter((s) => s.cycle_id === activeCycleId);
  const isDraft = activeCycle?.status === "draft";
  const filteredPrograms = data.programs.filter((p) => (filter === "all" || p.status === filter) && (p.title + " " + p.description).toLowerCase().includes(search.toLowerCase()));
  const checks = activeCycle ? [
    {name: "A draft cycle is selected", ok: isDraft},
    {name: "Official portal uses HTTPS", ok: Boolean(activeCycle.official_url && isHttpsLink(activeCycle.official_url))},
    {name: "At least one requirement exists", ok: cycleRequirements.length > 0},
    {name: "Every requirement has acquisition steps", ok: cycleRequirements.length > 0 && cycleRequirements.every((r) => data.steps.some((s) => s.requirement_id === r.id && s.instruction.trim()))},
    {name: "At least one approved, dated source", ok: cycleSources.some((s) => s.is_approved && Boolean(s.reviewed_at))},
    {name: "RAG source indexing & server authorization", ok: false}
  ] : [];
  const preflightReady = checks.length > 0 && checks.every((c) => c.ok);

  function editProgram(p: Program) {
    setProgramId(p.id); setCycleMode("none");
    setProgramForm({title:p.title,description:p.description}); setProgramMode("edit");
  }
  async function saveProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = programForm.title.trim(), description = programForm.description.trim();
    if (title.length < 3 || description.length < 10) { setError("Enter a program name (at least 3 characters) and description (at least 10 characters)."); return; }
    const editingId = programMode === "edit" ? activeProgram?.id : null;
    await act(async (sb) => {
      if (editingId) {
        const {error: saveError} = await sb.from("scholarship_programs").update({title, description}).eq("id", editingId);
        if (saveError) throw saveError;
      } else {
        const {data: saved, error: saveError} = await sb.from("scholarship_programs").insert({title,description,status:"draft"}).select("id").single();
        if (saveError) throw saveError;
        if (saved) setProgramId(saved.id as string);
      }
      setProgramMode("none"); setProgramForm(initProgram);
    }, editingId ? "Program changes saved." : "Draft program created. Add an application cycle next.");
  }
  function editCycle(c: Cycle) {
    setCycleId(c.id); setCycleForm({academic_year:c.academic_year,application_start:c.application_start || "",application_end:c.application_end || "",official_url:c.official_url || ""}); setCycleMode("edit");
  }
  async function saveCycle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeProgram) {setError("Select a scholarship program first.");return;}
    if (!cycleForm.academic_year.trim()) {setError("Enter an academic year.");return;}
    if (cycleForm.official_url && !isHttpsLink(cycleForm.official_url)) {setError("The official portal link must be an HTTPS URL.");return;}
    if (cycleForm.application_start && cycleForm.application_end && cycleForm.application_end < cycleForm.application_start) {setError("The end date cannot be earlier than the start date.");return;}
    const editingId = cycleMode === "edit" ? activeCycle?.id : null;
    const values = {academic_year:cycleForm.academic_year.trim(), application_start:cycleForm.application_start || null, application_end:cycleForm.application_end || null, official_url:cycleForm.official_url.trim() || null};
    await act(async (sb) => {
      if (editingId) {
        const {error: saveError} = await sb.from("application_cycles").update(values).eq("id", editingId);
        if (saveError) throw saveError;
      } else {
        const {data: saved, error: saveError} = await sb.from("application_cycles").insert({...values,program_id:activeProgram.id,status:"draft"}).select("id").single();
        if (saveError) throw saveError;
        if (saved) setCycleId(saved.id as string);
      }
      setCycleMode("none"); setCycleForm(initCycle);
    }, editingId ? "Cycle changes saved." : "New draft cycle created.");
  }
  function editRequirement(r?: Requirement) {
    setError("");
    setRequirementId(r?.id || "new");
    if (!r) { setRequirementForm(initRequirement()); return; }
    setRequirementForm({
      title:r.title,description:r.description,is_required:r.is_required,
      steps: data.steps.filter((s) => s.requirement_id === r.id).sort((a,b) => a.position-b.position).map((s) => s.instruction),
      faqs: data.faqs.filter((f) => f.requirement_id === r.id).map((f) => ({question:f.question,answer:f.answer}))
    });
  }
  async function saveRequirement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeCycle || !isDraft) return;
    if (!requirementForm.title.trim() || !requirementForm.steps.some((s)=>s.trim())) {setError("Every requirement needs a title and at least one actionable step.");return;}
    if (requirementForm.faqs.some((f) => !f.question.trim() || !f.answer.trim())) {setError("Complete both fields in every FAQ, or remove empty entries.");return;}
    const editingId = requirementId !== "new" ? requirementId : null;
    await act(async (sb) => {
      let id = editingId;
      if (id) {
        const {error: saveError} = await sb.from("requirements").update({title:requirementForm.title.trim(),description:requirementForm.description.trim(),is_required:requirementForm.is_required}).eq("id",id);
        if (saveError) throw saveError;
      } else {
        const {data: saved,error: saveError} = await sb.from("requirements").insert({cycle_id:activeCycle.id,title:requirementForm.title.trim(),description:requirementForm.description.trim(),is_required:requirementForm.is_required,position:cycleRequirements.length}).select("id").single();
        if (saveError) throw saveError;
        id = saved.id as string;
      }
      if (!id) throw new Error("Cannot save requirement without an ID.");
      // Draft-only rewrite. Member 3 should replace this with a transaction before production publishing.
      if (editingId) {
        const s = await sb.from("requirement_steps").delete().eq("requirement_id",id);
        if (s.error) throw s.error;
        const f = await sb.from("faqs").delete().eq("requirement_id",id);
        if (f.error) throw f.error;
      }
      const steps = requirementForm.steps.map((instruction,position) => ({requirement_id:id,position,instruction:instruction.trim()})).filter((x)=>x.instruction);
      const faqs = requirementForm.faqs.map((f) => ({requirement_id:id,question:f.question.trim(),answer:f.answer.trim()}));
      const s = await sb.from("requirement_steps").insert(steps);
      if (s.error) throw s.error;
      if (faqs.length) { const f = await sb.from("faqs").insert(faqs); if (f.error) throw f.error; }
      setRequirementId(null);
    }, editingId ? "Requirement journey updated." : "Requirement journey saved as draft.");
  }
  async function saveSource(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeCycle || !isDraft) return;
    if (sourceTitle.trim().length < 3 || !isHttpsLink(sourceUrl.trim())) {setError("Enter a source title and a valid HTTPS reference URL.");return;}
    await act(async(sb)=>{
      const {error: saveError} = await sb.from("knowledge_sources").insert({cycle_id:activeCycle.id,title:sourceTitle.trim(),source_url:sourceUrl.trim(),is_approved:false});
      if(saveError) throw saveError;
      setSourceTitle(""); setSourceUrl("");
    },"Reference saved as unapproved. A designated reviewer must verify it before indexing.");
  }
  async function requestPublish() {
    if (!activeCycle || !preflightReady || role !== "publisher" || !client) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const {data: session} = await client.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");
      const response = await fetch("/api/admin/publish", {method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer " + token},body:JSON.stringify({cycleId:activeCycle.id})});
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Publishing API is unavailable ("+response.status+"). Contact the backend team.");
      await reload(client); setMessage("Publication completed by the server. Verify the applicant view.");
    } catch (err) {setError(errorText(err));} finally {setBusy(false);}
  }

  if (gate !== "ready") return <MotionConfig reducedMotion="user"><div className="admin-portal flex min-h-screen items-center justify-center bg-[#f5f8f4] px-4 py-10">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-xl font-bold text-[#174d36]"><BookOpenCheck size={25}/> gabayiskolar<span className="text-[#586f60]">.</span></Link>
      <Card className="!p-7 sm:!p-9"><div className="mb-6 inline-flex rounded-2xl bg-[#e6f3eb] p-3 text-[#176448]"><LockKeyhole size={25} aria-hidden="true"/></div><h1 className="text-2xl font-semibold tracking-tight text-[#163e30]">Admin workspace</h1><p className="mt-2 text-sm leading-6 text-[#5c7568]">Sign in with your pre-provisioned administrator account. Applicant accounts cannot edit scholarship guidance.</p>
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
      {gate === "loading" ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#4d6f60]"><LoaderCircle size={18} className="animate-spin"/> Checking access securely…</p> : null}
      {gate === "setup" ? <div className="mt-6"><Notice>Supabase configuration is missing. Ask the backend team to configure public environment variables. Admin actions are disabled.</Notice></div> : null}
      {gate === "denied" ? <div className="mt-6 space-y-4"><Notice tone="error">Access denied. This account is not assigned an editor or publisher role.</Notice><Button variant="outline" onClick={() => void signOut()}>Sign out and use another account</Button></div> : null}
      {gate === "error" ? <div className="mt-6"><Button variant="outline" onClick={() => void authenticate()}><RefreshCw size={16}/> Retry connection</Button></div> : null}
      {gate === "login" ? <form onSubmit={(e)=>void signIn(e)} className="mt-7 space-y-5">
        <Field label="Email address" htmlFor="admin-email" required><input id="admin-email" className={inputClass} autoComplete="username" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></Field>
        <Field label="Password" htmlFor="admin-password" required><input id="admin-password" className={inputClass} autoComplete="current-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required/></Field>
        <Button className="w-full" type="submit" busy={busy}>Sign in securely <ArrowRight size={16}/></Button>
      </form> : null}</Card><p className="mt-5 text-center text-xs leading-5 text-[#586f60]">Independent project. Not a government administration portal.</p>
    <div className="mt-5 border-t border-[#e3ece4] pt-5 text-center"><Link href="/admin/demo" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#176448] underline underline-offset-4">Explore read-only UI demo <ArrowRight size={16}/></Link></div></div></div></MotionConfig>;

  return <MotionConfig reducedMotion="user"><div className="admin-portal min-h-screen bg-[#f7f9f6] text-[#1d3e33] lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
    <aside className="hidden min-h-screen overflow-y-auto border-r border-[#e3eae3] bg-white px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <Link href="/" className="mb-10 flex items-center gap-2 px-3 text-xl font-bold tracking-tight text-[#164b35]"><BookOpenCheck className="h-7 w-7"/>gabay<span className="-ml-2 text-[#586f60]">iskolar.</span></Link>
      <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[.12em] text-[#586f60]">Workspace</p><LinkNav section={section} demoMode={demoMode}/>

      <div className="mt-6 border-t border-[#e6eee6] pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[.08em] text-[#586f60]">Account</p>
        {demoMode
          ? <Link href="/admin" className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#486a57] transition-colors hover:bg-[#edf4ee]"><LockKeyhole size={18} aria-hidden="true"/> Admin sign-in</Link>
          : <button onClick={() => void signOut()} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#486a57] transition-colors hover:bg-[#edf4ee]"><LogOut size={18} aria-hidden="true"/> Sign out</button>}
      </div>
      <div className="mt-auto pt-6">
        <div className="rounded-xl border border-[#dfe9df] bg-[#f3f7f1] p-4">
          <div className="mb-2 flex items-center gap-2 text-[#2d7855]"><ShieldCheck aria-hidden="true" className="h-5 w-5"/><span className="text-sm font-semibold text-[#315541]">Source-first publishing</span></div>
          <p className="text-sm leading-6 text-[#586f60]">Verify the source before applicants see guidance.</p>
        </div>
        <div className="admin-bottom-clearance" aria-hidden="true"/>
      </div>
    </aside>
    <div className="min-w-0">
      <div className="sticky top-0 z-20 border-b border-[#e1eae1] bg-white/95 backdrop-blur-xl">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-2"><span className="font-bold text-[#194b37] lg:hidden">gabayiskolar.</span><span className="hidden text-sm font-medium text-[#586f60] lg:inline">Admin workspace</span><ChevronRight size={14} aria-hidden="true" className="hidden text-[#586f60] lg:inline"/><span className="hidden truncate text-sm font-semibold text-[#1a4334] lg:inline">{info[section].label}</span></div>
          <div className="flex items-center gap-2"><span className="inline-flex rounded-full border border-[#d8e8db] bg-[#eff7f1] px-3 py-1.5 text-xs font-semibold capitalize text-[#2b674b]">{demoMode ? "Demo preview" : role + " access"}</span>{demoMode ? <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#e1eae1] text-[#456553] lg:hidden" aria-label="Admin sign-in"><LockKeyhole size={18}/></Link> : <button className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#e1eae1] text-[#456553] lg:hidden" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={18}/></button>}</div>
        </div>
        <div className="overflow-x-auto border-t border-[#edf0ed] lg:hidden"><LinkNav section={section} mobile demoMode={demoMode}/></div>
      </div>
      <main className="mx-auto min-w-0 w-full max-w-[1340px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
        {demoMode ? <div className="mb-5"><Notice>This is an <strong>interactive UI preview</strong> using fictional data. You can try controls and step ordering, but no changes are saved or published. No live records are loaded.</Notice></div> : null}
        <AnimatePresence initial={false} mode="wait">
          {error ? <motion.div key="admin-error" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}} className="mb-5"><Notice tone="error">{error}</Notice></motion.div>
           : message ? <motion.div key="admin-success" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}} className="mb-5"><Notice tone="success">{message}</Notice></motion.div>
           : null}
        </AnimatePresence>
        <AnimatePresence mode="wait"><motion.div key={section} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.18,ease:"easeOut"}}>
          {section === "overview" ? <>
            <Heading eyebrow="Content management" title="Welcome to your workspace" description="A clear view of the scholarship guidance your team is preparing."/>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stat(data.programs.length,"Programs",<GraduationCap size={19}/>, "All managed programs",0)}
              {stat(data.cycles.filter(c=>c.status==="draft").length,"Draft cycles",<FileText size={19}/>, "Not visible to applicants",0.055)}
              {stat(data.cycles.filter(c=>c.status==="published").length,"Published cycles",<Check size={19}/>, "Public guidance",0.11)}
              {stat(data.sources.filter(s=>!s.is_approved).length,"Sources to review",<LibraryBig size={19}/>, "Not approved for retrieval",0.165)}
            </div>
            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
              <Card><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Scholarship programs</h2><Link href="/admin/programs"><StepLink>Manage all</StepLink></Link></div>
                {data.programs.length ? <div className="divide-y divide-[#e9eee8]">{data.programs.slice(0,5).map((p)=><Link key={p.id}
  href={demoMode ? "/admin/demo?view=programs&program=" + encodeURIComponent(p.id) : "/admin/programs/" + encodeURIComponent(p.id)}
  aria-label={"Open " + p.title + " program details"}
  className="group flex min-h-20 items-center justify-between gap-3 rounded-lg px-3 py-4 transition-[background-color,transform] duration-150 hover:bg-[#f0f7f1] active:scale-[.997] focus-visible:outline-2 focus-visible:outline-[#236e4e]"
><div className="min-w-0"><p className="font-semibold text-[#24483a]">{p.title}</p><p className="mt-1 text-xs text-[#586f60]">{data.cycles.filter(c=>c.program_id===p.id).length} application cycle(s)</p></div><div className="flex shrink-0 items-center gap-2"><Pill status={p.status}/><ChevronRight size={18} aria-hidden="true" className="text-[#376b4b] transition-transform duration-150 group-hover:translate-x-0.5"/></div></Link>)}</div> : <Empty title="No scholarship programs" message="Create your first draft. It will remain private until publication."/>}
              </Card>
              <Card><h2 className="text-lg font-semibold">Recommended workflow</h2><ol className="mt-6 space-y-6">{[["Create a program","Add a program and application cycle."],["Add requirements","Write actionable document steps and FAQs."],["Verify source material","Review trusted official references."],["Preview before publishing","Confirm readiness with your publisher."]].map(([title,detail],index)=><li key={title} className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9f3ea] text-xs font-bold text-[#306a4e]">{index+1}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#586f60]">{detail}</p></div></li>)}</ol></Card>
            </div>
            <div className="mt-5"><Notice>Only verified, published scholarship guidance should appear to applicants. This console does not make scholarship eligibility decisions.</Notice></div>
          </> : null}

          {section === "programs" ? <>
            <Heading eyebrow="Content library" title="Scholarship programs" description="Draft, review, and organize scholarship guides. Never invent application dates." action={<Button onClick={()=>{setProgramForm(initProgram);setProgramMode("new");setError("");}}><Plus size={17}/> New program</Button>}/>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
              <div className="space-y-5">
                <Card><div className="grid gap-3 sm:grid-cols-[1fr_160px]"><ProgramSearch value={search} onChange={setSearch} programNames={data.programs.map(p=>p.title)} scope={demoMode?"demo":"admin"}/><div><label htmlFor="program-filter" className="sr-only">Filter publication status</label><AdminSelect id="program-filter" value={filter} onChange={setFilter} placeholder="All statuses" options={[{value:"all",label:"All statuses"},{value:"draft",label:"Draft"},{value:"published",label:"Published"},{value:"archived",label:"Archived"}]}/></div></div></Card>
                <Card className="!p-0"><div className="border-b border-[#e6eee6] px-5 py-4 text-sm font-semibold">{filteredPrograms.length} program(s)</div>{!filteredPrograms.length ? <div className="p-5"><Empty title="No matching programs" message="Try a different search or create a draft program."/></div> : <ul className="divide-y divide-[#e8eee7]">{filteredPrograms.map(p=><li key={p.id} className={"p-5 transition-colors hover:bg-[#f9fbf8] "+(activeProgramId===p.id?"bg-[#f3f9f3]":"")}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold text-[#1f4938]">{p.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#586f60]">{p.description}</p><p className="mt-2 text-xs text-[#586f60]">{data.cycles.filter(c=>c.program_id===p.id).length} cycle(s)</p></div><Pill status={p.status}/></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>{setProgramId(p.id);setCycleId("");setCycleMode("none");setProgramMode("none");}}>View cycles</Button><Button variant="outline" onClick={()=>editProgram(p)}>Edit <ChevronRight size={15}/></Button></div></li>)}</ul>}</Card>
              </div>
              <div className="space-y-5">
                <Card><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{programMode==="new"?"Create program":programMode==="edit"?"Edit program":"Program details"}</h2>{programMode!=="none" ? <button className="rounded-lg p-2 hover:bg-[#f1f5f1]" onClick={()=>setProgramMode("none")} aria-label="Cancel editing program"><X size={18}/></button> : null}</div>
                  {programMode!=="none" ? <form className="space-y-4" onSubmit={e=>void saveProgram(e)}>
                    <Field htmlFor="program-title" label="Program name" required><input id="program-title" required maxLength={140} className={inputClass} value={programForm.title} onChange={e=>setProgramForm({...programForm,title:e.target.value})} placeholder="As shown in the official source"/></Field>
                    <Field htmlFor="program-desc" label="Program description" required><AutoTextarea id="program-desc" required minLength={10} className={areaClass} value={programForm.description} onChange={e=>setProgramForm({...programForm,description:e.target.value})} placeholder="Explain who the verified guide is for."/></Field>
                    <Button busy={busy} type="submit">{programMode==="new"?"Create draft":"Save changes"}</Button>
                  </form> : activeProgram ? <><p className="text-sm leading-6 text-[#586f60]">{activeProgram.description}</p><div className="mt-4"><Pill status={activeProgram.status}/></div><Button variant="outline" className="mt-3" onClick={()=>editProgram(activeProgram)}>Edit program <ArrowRight size={16}/></Button></> : <Empty title="Select a program" message="Choose a program to view its cycles."/>}
                </Card>
                {activeProgram && programMode==="none" ? <Card><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Application cycles</h2><Button variant="outline" onClick={()=>{setCycleMode("new");setCycleForm(initCycle);}}> <Plus size={16}/> Add cycle</Button></div>
                  <div className="space-y-2">{programCycles.length ? programCycles.map(c=><div key={c.id} className={"rounded-xl border p-3 "+(activeCycleId===c.id?"border-[#acd0b4] bg-[#f4faf4]":"border-[#e2ebe3]")}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{c.academic_year}</span><Pill status={c.status}/></div><p className="mt-1 text-xs text-[#586f60]">{c.application_start && c.application_end ? formatDate(c.application_start)+" – "+formatDate(c.application_end) : "Application dates unverified"}</p><div className="mt-2 flex gap-2"><Button onClick={()=>{setCycleId(c.id);setCycleMode("none");}}>Select</Button><Button variant="outline" onClick={()=>editCycle(c)} disabled={c.status!=="draft"}>Edit</Button></div></div>) : <p className="text-sm text-[#586f60]">No cycles yet. Add a draft academic-year guide.</p>}</div>
                  {cycleMode!=="none" ? <form className="mt-5 space-y-4 border-t border-[#e2eae1] pt-5" onSubmit={e=>void saveCycle(e)}>
                    <h3 className="font-semibold">{cycleMode==="new"?"New cycle":"Edit draft cycle"}</h3>
                    <Field htmlFor="cycle-year" label="Academic year / cycle" required><input id="cycle-year" className={inputClass} value={cycleForm.academic_year} onChange={e=>setCycleForm({...cycleForm,academic_year:e.target.value})} placeholder="Only use a verified cycle" required/></Field>
                    <div className="grid gap-3 sm:grid-cols-2"><Field htmlFor="cycle-start" label="Verified start date"><input id="cycle-start" type="date" className={inputClass} value={cycleForm.application_start} onChange={e=>setCycleForm({...cycleForm,application_start:e.target.value})}/></Field><Field htmlFor="cycle-end" label="Verified end date"><input id="cycle-end" type="date" className={inputClass} value={cycleForm.application_end} onChange={e=>setCycleForm({...cycleForm,application_end:e.target.value})}/></Field></div>
                    <Field htmlFor="cycle-url" label="Official portal URL" hint="HTTPS only; confirm the destination from an authoritative source."><input id="cycle-url" type="url" className={inputClass} value={cycleForm.official_url} onChange={e=>setCycleForm({...cycleForm,official_url:e.target.value})} placeholder="https://…"/></Field>
                    <div className="flex flex-wrap gap-2"><Button type="submit" busy={busy}>Save draft cycle</Button><Button type="button" variant="quiet" onClick={()=>setCycleMode("none")}>Cancel</Button></div>
                  </form> : null}
                </Card> : null}
              </div>
            </div>
          </> : null}

          {section === "requirements" ? <>
            <Heading eyebrow="Preparation guidance" title="Requirement builder" description="Write clear acquisition steps and FAQs. Save only verified instructions to your draft."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={setProgramId} onCycle={setCycleId}/>
            {!activeCycle ? <Empty title="No application cycle selected" message="Create or choose an application cycle before adding requirements."><Link href="/admin/programs"><StepLink>Manage scholarship programs</StepLink></Link></Empty> : <div className="grid gap-5 xl:grid-cols-[minmax(260px,.8fr)_minmax(0,1.3fr)]">
              <Card className="self-start"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">Checklist items</h2><Pill status={activeCycle.status}/></div><div className="space-y-2">{cycleRequirements.map((r,index)=><button key={r.id} className={"flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors "+(requirementId===r.id?"border-[#98c7a6] bg-[#eff8f0]":"border-[#e1eae2] hover:bg-[#f5faf5]")} onClick={()=>editRequirement(r)}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e9f2ea] text-xs font-bold text-[#286047]">{index+1}</span><span className="flex-1 font-semibold">{r.title}</span><ChevronRight size={15} className="shrink-0"/></button>)}{!cycleRequirements.length ? <p className="py-4 text-sm leading-6 text-[#586f60]">No requirements yet. Add the first item for this cycle.</p> : null}</div>{isDraft ? <Button className="mt-5 w-full" variant="outline" onClick={()=>editRequirement()}><Plus size={16}/> Add requirement</Button> : <p className="mt-4 text-xs leading-5 text-[#7b6d4e]">Published cycles are read-only here. Use a versioned update workflow.</p>}</Card>
              <Card>{!requirementId ? <Empty title="Select a requirement" message="Choose a checklist item or create a new one. Each item needs actionable steps and approved source backing."/> : <form onSubmit={e=>void saveRequirement(e)} className="space-y-5">
                <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{requirementId==="new"?"New requirement":"Edit requirement"}</h2><button type="button" onClick={()=>setRequirementId(null)} className="rounded-lg p-2 hover:bg-[#f1f5f1]" aria-label="Close requirement editor"><X size={18}/></button></div>
                {!isDraft ? <Notice>Published requirements are read-only. Create a new version with the backend publishing workflow.</Notice> : null}
                <Field htmlFor="req-title" label="Requirement title" required><input id="req-title" className={inputClass} value={requirementForm.title} onChange={e=>setRequirementForm({...requirementForm,title:e.target.value})} required disabled={!isDraft}/></Field>
                <Field htmlFor="req-desc" label="Why this document is needed" hint="Only include claims supported by an approved reference."><AutoTextarea id="req-desc" className={areaClass} value={requirementForm.description} onChange={e=>setRequirementForm({...requirementForm,description:e.target.value})} disabled={!isDraft}/></Field>
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={requirementForm.is_required} onChange={e=>setRequirementForm({...requirementForm,is_required:e.target.checked})} className="h-5 w-5 accent-[#176448]" disabled={!isDraft}/> Required for this cycle (uncheck if conditional)</label>
                <div className="border-t border-[#e5ece5] pt-6">
                  <StepBuilder
                    key={activeCycleId+":"+requirementId}
                    steps={requirementForm.steps}
                    disabled={!isDraft}
                    onChange={steps=>setRequirementForm(prev=>({...prev,steps}))}
                  />
                </div>
                <fieldset className="space-y-3 border-t border-[#e5ece5] pt-5"><legend className="text-base font-semibold">Frequently asked questions</legend>
                  {requirementForm.faqs.map((f,index)=><div className="rounded-xl border border-[#e2eae1] bg-[#fbfdfb] p-3" key={index}><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">FAQ {index+1}</span>{isDraft?<button type="button" aria-label={"Remove FAQ "+(index+1)} onClick={()=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.filter((_,i)=>i!==index)}))} className="rounded-lg p-2 hover:bg-[#f4eae8]"><X size={16}/></button>:null}</div><label htmlFor={"faq-q-"+index} className="block text-xs font-medium">Question</label><input id={"faq-q-"+index} className={inputClass} value={f.question} disabled={!isDraft} onChange={e=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.map((a,i)=>i===index?{...a,question:e.target.value}:a)}))}/><label htmlFor={"faq-a-"+index} className="mt-3 block text-xs font-medium">Answer</label><AutoTextarea id={"faq-a-"+index} className={areaClass} value={f.answer} disabled={!isDraft} onChange={e=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.map((a,i)=>i===index?{...a,answer:e.target.value}:a)}))}/></div>)}
                  {isDraft ? <Button type="button" variant="outline" onClick={()=>setRequirementForm({...requirementForm,faqs:[...requirementForm.faqs,{question:"",answer:""}]})}><Plus size={16}/> Add FAQ</Button> : null}
                </fieldset>
                {isDraft ? <div className="flex flex-wrap gap-2 border-t border-[#e5ece5] pt-5"><Button type="submit" busy={busy}>Save requirement draft</Button><Button type="button" variant="quiet" onClick={()=>setRequirementId(null)}>Cancel</Button></div>:null}
              </form>}</Card>
            </div>}
          </> : null}

          {section === "knowledge" ? <>
            <Heading eyebrow="Reference governance" title="Knowledge sources" description="Collect trusted official references. Unreviewed sources must remain unavailable to applicant AI."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={setProgramId} onCycle={setCycleId}/>
            {!activeCycle ? <Empty title="Choose an application cycle" message="Create a cycle before managing its reference sources."/> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.8fr)]">
              <Card><h2 className="mb-4 text-lg font-semibold">Reference register</h2>
                {!cycleSources.length ? <Empty title="No sources attached" message="Add an official reference link. The source starts unapproved until a reviewer verifies it."/> : <div className="divide-y divide-[#e5ede5]">{cycleSources.map(s=><article key={s.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{s.title}</h3><Pill status={s.is_approved?"approved":"in review"}/></div><p className="mt-2 text-xs leading-5 text-[#586f60]">Version {s.content_version} · Reviewed {formatDate(s.reviewed_at?s.reviewed_at.slice(0,10):null)}</p>{s.source_url && isHttpsLink(s.source_url) ? <a className="mt-3 inline-flex min-h-11 items-center gap-2 break-all text-sm font-semibold text-[#176448] underline underline-offset-4" href={s.source_url} target="_blank" rel="noopener noreferrer">Open reference <ExternalLink size={15}/></a> : <p className="mt-2 text-xs text-[#994e44]">No verified HTTPS source URL.</p>}</article>)}</div>}
              </Card>
              <Card className="self-start"><h2 className="text-lg font-semibold">Attach a reference</h2><p className="mt-2 text-sm leading-6 text-[#586f60]">Use a credible publication from the responsible office. Adding a link does not approve or index it.</p><form className="mt-5 space-y-4" onSubmit={e=>void saveSource(e)}><Field htmlFor="source-title" label="Source title" required><input id="source-title" className={inputClass} required value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} disabled={!isDraft}/></Field><Field htmlFor="source-url" label="Official HTTPS link" required><input id="source-url" className={inputClass} type="url" required placeholder="https://…" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} disabled={!isDraft}/></Field><Button type="submit" busy={busy} disabled={!isDraft}>Save unapproved source</Button></form><div className="mt-4"><Notice>Source approval and RAG indexing must be confirmed through the backend reviewer workflow. This frontend never marks a new source approved.</Notice></div></Card>
            </div>}
          </> : null}

          {section === "preview" ? <>
            <Heading eyebrow="Publication readiness" title="Preview & publish" description="Check evidence and content completeness before a publisher triggers the server-side publication workflow."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={setProgramId} onCycle={setCycleId}/>
            {!activeCycle ? <Empty title="No cycle to preview" message="Select or create a draft cycle, then return here for pre-publication checks."/> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.85fr)]">
              <Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#586f60]">Applicant guide preview</p><h2 className="mt-2 text-xl font-semibold">{activeProgram?.title}</h2><p className="mt-1 text-sm text-[#607969]">{activeCycle.academic_year}</p></div><Pill status={activeCycle.status}/></div><p className="mb-5 text-sm leading-6 text-[#637a6a]">This preview is for preparation only. It does not assess eligibility or submit an application.</p><h3 className="mb-3 text-sm font-semibold">Document checklist</h3>{!cycleRequirements.length ? <Empty title="No requirements yet" message="Add requirements and steps to preview the applicant guide."/> : <div className="space-y-3">{cycleRequirements.map(r=><div key={r.id} className="rounded-xl border border-[#dfe9e0] bg-[#fcfdfb] p-4"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{r.title}</h4><span className="text-xs text-[#586f60]">{r.is_required?"Required":"Conditional"}</span></div><p className="mt-2 text-sm leading-6 text-[#586f60]">{r.description}</p><ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-[#405f4e]">{data.steps.filter(s=>s.requirement_id===r.id).sort((a,b)=>a.position-b.position).map(s=><li key={s.id}>{s.instruction}</li>)}</ol>{data.faqs.filter(f=>f.requirement_id===r.id).map(f=><FaqAccordion key={f.id} question={f.question} answer={f.answer}/>)}</div>)}</div>}{activeCycle.official_url && isHttpsLink(activeCycle.official_url) ? <a href={activeCycle.official_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#176448] underline underline-offset-4">Official application portal <ExternalLink size={16}/></a> : <p className="mt-4 text-sm text-[#9c5845]">Official portal link not provided.</p>}</Card>
              <Card className="self-start"><h2 className="text-lg font-semibold">Publication checklist</h2><p className="mt-2 text-xs leading-5 text-[#586f60]">Incomplete checks prevent the publish action.</p><ul className="mt-5 space-y-4">{checks.map(c=><li key={c.name} className="flex items-start gap-3 text-sm"><span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full "+(c.ok?"bg-[#e3f3e5] text-[#25734a]":"bg-[#fff0dd] text-[#8c5f22]")}>{c.ok?<Check size={13}/>:<X size={12}/>}</span><span className="leading-6">{c.name}</span></li>)}</ul><div className="mt-6 border-t border-[#e5ece4] pt-5"><Button className="w-full" disabled={!preflightReady || role!=="publisher" || busy} busy={busy} onClick={()=>void requestPublish()}><ShieldCheck size={17}/> Publish verified guide</Button><p className="mt-3 text-xs leading-5 text-[#586f60]">{demoMode ? "Demo preview cannot publish. The real workflow requires a verified publisher account." : role!=="publisher" ? "A publisher role is required." : "Final approval requires server-side verification, including RAG source indexing and version checks."}</p></div><div className="mt-4"><Notice>RAG indexing and publisher authorization are not yet verifiable from this frontend. Publication is intentionally blocked until the backend implements and verifies them.</Notice></div></Card>
            </div>}
          </> : null}
        </motion.div></AnimatePresence>
        <footer className="mt-10 border-t border-[#dce8dd] pt-5 text-xs leading-6 text-[#586f60]">GabayIskolar is an independent prototype, not a Pasig City Government service. Scholarship decisions and submissions belong to the official office.</footer>
      </main>
    </div>
  </div></MotionConfig>;
}
