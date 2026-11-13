"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight, Check, ChevronRight, ClipboardCheck, FileCheck2, FileText, GraduationCap,
  LayoutDashboard, LibraryBig, LoaderCircle, LockKeyhole, LogOut, Plus, RefreshCw,
  ShieldCheck, MapPin, FileUp, X
} from "lucide-react";
import { api, HttpError } from "@/lib/http-client";
import { Button, Card, Empty, Field, Heading, Notice, Pill, StepLink, inputClass, areaClass } from "./ui";
import { demoPublicationChecks, emptyData, formatDate, isHttpsLink, loadAdminData, type AdminData, type Cycle, type Program, type Requirement, type Role } from "./data";
import { demoData } from "./demo-data";
import { clearDemoSandbox, demoId, readDemoSandbox, upsertDemoCycle, upsertDemoProgram, upsertDemoRequirement, upsertDemoSource, writeDemoSandbox } from "./demo-actions";
import { AdminSelect } from "./select";
import { StepBuilder } from "./step-builder";
import { AutoTextarea } from "./auto-textarea";
import { ProgramSearch } from "./program-search";
import { GabayBrand } from "@/components/shared/gabay-brand";
import { OperationsPanel, AdminWorkflow, ApplicantContentPreview } from "./operations";
import type { ContextDraft } from "./context-import";
import { AdminImportDialog } from "./import-dialog";
import { RequirementImportDialog, type RequirementSuggestion } from "./requirement-import";
import { mapPinUrl } from "@/lib/guides/schema";
import { AdminPagination, ADMIN_PAGE_SIZE, safeAdminPage } from "./pagination";
import { AdminLoginScreen } from "./login-screen";
import "./admin.css";

export type Section = "overview" | "programs" | "requirements" | "knowledge" | "preview";
const menu = [
  { id: "overview", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { id: "programs", label: "Scholarship guides", href: "/admin/programs", icon: GraduationCap },
  { id: "requirements", label: "Requirements & FAQs", href: "/admin/requirements", icon: ClipboardCheck },
  { id: "knowledge", label: "Knowledge & sources", href: "/admin/knowledge", icon: LibraryBig },
  { id: "preview", label: "Review & publish", href: "/admin/preview", icon: FileCheck2 }
] as const;
const info: Record<Section, { label: string; description: string }> = {
  overview: { label: "Dashboard", description: "Your workspace for source-backed scholarship content." },
  programs: { label: "Scholarship guides", description: "Create and maintain program and academic-year drafts." },
  requirements: { label: "Requirements & FAQs", description: "Give applicants a clear, verified document journey." },
  knowledge: { label: "Knowledge & sources", description: "Keep reference material traceable and reviewed." },
  preview: { label: "Review & publish", description: "Check readiness before sending content to the official publication workflow." }
};
const initProgram = { title: "", description: "" };
const initCycle = { academic_year: "", application_start: "", application_end: "", official_url: "" };
type FAQDraft = { question: string; answer: string };
type RequirementDraft = { title: string; description: string; is_required: boolean; steps: string[]; faqs: FAQDraft[]; issuingOffice:string; officeAddress:string; officeHours:string; mapUrl:string };
const initRequirement = (): RequirementDraft => ({ title: "", description: "", is_required: true, steps: [""], faqs: [], issuingOffice:"", officeAddress:"", officeHours:"", mapUrl:"" });
const errorText = (err: unknown) => err instanceof Error ? err.message : "Something went wrong. Please retry.";
const stat = (value: number, title: string, icon: ReactNode, subtitle: string, delay = 0) => <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.26,delay,ease:[0.22,1,0.36,1]}} className="h-full"><Card className="h-full"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-[#53657b]">{title}</span><span className="rounded-xl bg-[#eef6ff] p-2 text-[#155bb0]">{icon}</span></div><p className="mt-3 text-3xl font-semibold tracking-tight text-[#102a51]" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p><p className="mt-1 text-xs leading-5 text-[#53657b]">{subtitle}</p></Card></motion.div>;

function LinkNav({ section, mobile = false, demoMode = false }: { section: Section; mobile?: boolean; demoMode?: boolean }) {
  return <nav aria-label="Admin sections" className={mobile ? "admin-mobile-nav flex min-w-max gap-1 px-3 py-2" : "space-y-1"}>
    {menu.map((item) => {
      const Icon = item.icon;
      return <Link key={item.id} href={demoMode ? "/admin/demo?view=" + item.id : item.href} aria-current={section === item.id ? "page" : undefined} className={(mobile ? "min-h-12 whitespace-nowrap px-3 " : "min-h-12 px-3 ") + "admin-sidebar-link group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0] " + (section === item.id ? "bg-[#eef6ff] text-[#102a51]" : "text-[#53657b] hover:bg-[#eef6ff] hover:text-[#102a51]")}><Icon size={19} aria-hidden="true" className="shrink-0 transition-transform duration-150 group-hover:scale-105"/>{item.label}</Link>;
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
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [gate, setGate] = useState<"loading"|"setup"|"login"|"denied"|"ready"|"error">(demoMode ? "ready" : "loading");
  const [role, setRole] = useState<Role | null>(demoMode ? "editor" : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData>(demoMode ? demoData : emptyData);
  useEffect(() => {
    if (!demoMode) return;
    setData(readDemoSandbox());
  }, [demoMode]);
  // Persist synchronously before route navigation can unmount this view.
  function commitDemo(next: AdminData) {
    writeDemoSandbox(next);
    setData(next);
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [programId, setProgramId] = useState(initialProgramId);
  const [cycleId, setCycleId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [programPage, setProgramPage] = useState(1);
  const [cyclePage, setCyclePage] = useState(1);
  const [requirementPage, setRequirementPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const [programMode, setProgramMode] = useState<"none"|"new"|"edit">(startCreateProgram ? "new" : "none");
  const [programForm, setProgramForm] = useState(initProgram);
  const [cycleMode, setCycleMode] = useState<"none"|"new"|"edit">("none");
  const [cycleForm, setCycleForm] = useState(initCycle);
  const [importedCycle, setImportedCycle] = useState<typeof initCycle | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [requirementForm, setRequirementForm] = useState<RequirementDraft>(initRequirement);
  const [showRequirementImport,setShowRequirementImport] = useState(false);
  const [requirementPrefilled,setRequirementPrefilled] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceApproved, setSourceApproved] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<{ checks: { name: string; ok: boolean }[]; ready: boolean } | null>(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);

  const reload = useCallback(async () => {
    const rows = await loadAdminData();
    setData(rows);
  }, []);
  const authenticate = useCallback(async () => {
    if (!configured) { setGate("setup"); return; }
    setGate("loading");
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (response.status === 401) { setData(emptyData); setRole(null); setGate("login"); return; }
      if (response.status === 403) { setData(emptyData); setRole(null); setGate("denied"); return; }
      const session = await response.json();
      if (!response.ok) throw new Error(session.error ?? "Could not verify your session");
      setRole(session.role as Role);
      await reload();
      setGate("ready");
      setError("");
    } catch (err) { setError(errorText(err)); setGate("error"); }
  }, [configured, reload]);
  useEffect(() => { if (!demoMode) void authenticate(); }, [authenticate, demoMode]);

  // Keep one authenticated console mounted across /admin routes.
  useEffect(() => {
    if (initialProgramId) {
      setProgramId(initialProgramId);
      setCycleId("");
      setCycleMode("none");
      setRequirementId(null);
      setProgramMode("none");
    }
  }, [initialProgramId]);
  useEffect(() => {
    if (startCreateProgram) {
      setProgramForm(initProgram);
      setProgramMode("new");
      setCycleMode("none");
    }
  }, [startCreateProgram]);
  const previousSection = useRef(section);
  useEffect(() => {
    if (previousSection.current !== section) {
      setError("");
      setMessage("");
      previousSection.current = section;
    }
  }, [section]);

  // Sign-out in another tab must immediately remove protected admin content.
  useEffect(() => {
    if (demoMode || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("gabayiskolar-admin-auth");
    channel.onmessage = (event) => {
      if (event.data === "signed-out") {
        setData(emptyData);
        setRole(null);
        setGate("login");
        setError("");
        setMessage("");
      }
    };
    return () => channel.close();
  }, [demoMode]);
  // Keep the existing content visible while fetching updates; never blank the dashboard.
  useEffect(() => {
    if (demoMode || gate !== "ready") return;
    let stopped = false;
    let running = false;
    const staleMessage = "Background sync failed. Showing the last loaded data. Changes from other admins may not be visible yet.";
    const refresh = async () => {
      if (stopped || running || document.visibilityState === "hidden") return;
      running = true;
      try {
        await reload();
        if (!stopped) setError(previous => previous === staleMessage ? "" : previous);
      } catch (err) {
        if (!stopped && err instanceof HttpError && (err.status === 401 || err.status === 403)) {
          setData(emptyData); setRole(null); setGate("login");
        } else if (!stopped) setError(staleMessage);
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
  }, [demoMode, gate, reload]);

  function resetDemo() {
    if (!demoMode) return;
    clearDemoSandbox();
    setData(demoData);
    setProgramId(""); setCycleId("");
    setProgramMode("none"); setCycleMode("none"); setRequirementId(null); setSourceId(null);
    setSearch(""); setFilter("all");
    setMessage("Demo sample data restored locally. No Supabase records were changed.");
    setError("");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true); setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      setPassword(""); await authenticate();
    } catch (err) { setPassword(""); setError(errorText(err)); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (demoMode) return;
    try { await api("/api/auth/logout", { method: "POST" }); }
    catch (err) { setError(errorText(err)); return; }
    if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("gabayiskolar-admin-auth"); channel.postMessage("signed-out"); channel.close(); }
    try { sessionStorage.removeItem("gabayiskolar-admin-recent-searches-v1"); } catch { /* session storage unavailable */ }
    setData(emptyData); setRole(null); setGate("login"); setError(""); setMessage("");
  }
  async function act(action: () => Promise<void>, success: string) {
    if (demoMode) { setError("Preview mode: changes are not saved. Sign in to the real admin workspace to make edits."); return; }
    if (role !== "publisher") { setError("Editors have read-only access. Ask a publisher to save changes."); return; }
    setBusy(true); setError(""); setMessage("");
    try { await action(); await reload(); setMessage(success); }
    catch (err) {
      if (err instanceof HttpError && err.status === 401) { setData(emptyData); setRole(null); setGate("login"); }
      setError(errorText(err));
    }
    finally { setBusy(false); }
  }

  const activeProgramId = programId || data.programs[0]?.id || "";
  const activeProgram = data.programs.find((p) => p.id === activeProgramId);
  const programCycles = data.cycles.filter((c) => c.program_id === activeProgramId);
  const activeCycleId = cycleId || programCycles[0]?.id || "";
  const activeCycle = programCycles.find((c) => c.id === activeCycleId);
  useEffect(() => {
    setSourceId(null); setSourceTitle(""); setSourceUrl(""); setSourceContent(""); setSourceApproved(false);
    setRequirementId(null);
  }, [activeCycleId]);
  const cycleRequirements = data.requirements.filter((r) => r.cycle_id === activeCycleId);
  const cycleSources = data.sources.filter((s) => s.cycle_id === activeCycleId);
  const isDraft = activeCycle?.status === "draft";
  const filteredPrograms = data.programs.filter((p) => (filter === "all" || p.status === filter) && (p.title + " " + p.description).toLowerCase().includes(search.toLowerCase()));
  const visiblePrograms = filteredPrograms.slice((safeAdminPage(programPage,filteredPrograms.length)-1)*ADMIN_PAGE_SIZE,safeAdminPage(programPage,filteredPrograms.length)*ADMIN_PAGE_SIZE);
  const visibleCycles = programCycles.slice((safeAdminPage(cyclePage,programCycles.length)-1)*ADMIN_PAGE_SIZE,safeAdminPage(cyclePage,programCycles.length)*ADMIN_PAGE_SIZE);
  const visibleRequirements = cycleRequirements.slice((safeAdminPage(requirementPage,cycleRequirements.length)-1)*ADMIN_PAGE_SIZE,safeAdminPage(requirementPage,cycleRequirements.length)*ADMIN_PAGE_SIZE);
  const visibleSources = cycleSources.slice((safeAdminPage(sourcePage,cycleSources.length)-1)*ADMIN_PAGE_SIZE,safeAdminPage(sourcePage,cycleSources.length)*ADMIN_PAGE_SIZE);
  const canEdit = demoMode || role === "publisher";
  const checks = demoMode && activeProgram && activeCycle ? demoPublicationChecks(data, activeProgram, activeCycle) : readiness?.checks ?? [];
  const preflightReady = !demoMode && !checkingReadiness && Boolean(readiness?.ready);
  useEffect(() => {
    setReadiness(null);
    if (demoMode || !activeCycleId || gate !== "ready") return;
    const controller = new AbortController();
    setCheckingReadiness(true);
    api<{ checks: { name: string; ok: boolean }[]; ready: boolean }>("/api/admin/guides/" + activeCycleId + "/readiness", { signal: controller.signal })
      .then(setReadiness).catch((err) => { if (!controller.signal.aborted) setError(errorText(err)); })
      .finally(() => { if (!controller.signal.aborted) setCheckingReadiness(false); });
    return () => controller.abort();
  }, [activeCycleId, data, demoMode, gate]);

  function applyContextDraft(draft: ContextDraft) {
    setProgramMode("new");
    setProgramForm({ title: draft.title, description: draft.description });
    setImportedCycle({
      academic_year: draft.academic_year,
      application_start: draft.application_start,
      application_end: draft.application_end,
      official_url: draft.official_url
    });
    setError("");
    setMessage("");
  }
  function editProgram(p: Program) {
    setProgramId(p.id); setCycleMode("none");
    setProgramForm({title:p.title,description:p.description}); setProgramMode("edit");
  }
  async function saveProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = programForm.title.trim(), description = programForm.description.trim();
    if (title.length < 3 || description.length < 10) { setError("Enter a program name (at least 3 characters) and description (at least 10 characters)."); return; }
    const editingId = programMode === "edit" ? activeProgram?.id : null;
    if (demoMode) {
      const id = editingId || demoId("program");
      commitDemo(upsertDemoProgram(data, {
        id, title, description, status: editingId ? activeProgram?.status ?? "draft" : "draft",
        created_at: editingId ? activeProgram?.created_at ?? new Date().toISOString() : new Date().toISOString(),
      }));
      setProgramId(id); setCycleId(""); setProgramMode("none"); setProgramForm(initProgram);
      if (!editingId && importedCycle) {
        setCycleForm(importedCycle); setCycleMode("new"); setImportedCycle(null);
      }
      setError(""); setMessage("Demo program draft updated locally. No Supabase records were saved.");
      return;
    }
    await act(async () => {
      const result = await api<{ program: Program }>(editingId ? "/api/admin/programs/" + editingId : "/api/admin/programs", {
        method: editingId ? "PATCH" : "POST", body: JSON.stringify({ title, description }),
      });
      setProgramId(result.program.id); setProgramMode("none"); setProgramForm(initProgram);
      if (!editingId && importedCycle) {
        setCycleForm(importedCycle); setCycleMode("new"); setImportedCycle(null);
      }
    }, editingId ? "Program changes saved as draft." : "Draft program created. Add an application cycle next.");
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
    if (demoMode) {
      const id = editingId || demoId("cycle");
      commitDemo(upsertDemoCycle(data, {
        id, program_id: activeProgram.id,
        academic_year: cycleForm.academic_year.trim(),
        application_start: cycleForm.application_start || null,
        application_end: cycleForm.application_end || null,
        official_url: cycleForm.official_url.trim() || null,
        status: editingId ? activeCycle?.status ?? "draft" : "draft",
        published_at: null,
      }));
      setCycleId(id); setCycleMode("none"); setCycleForm(initCycle);
      setError(""); setMessage("Demo cycle draft updated locally. No Supabase records were saved.");
      return;
    }
    await act(async () => {
      const result = await api<{ guide: { cycleId: string } }>("/api/admin/content", { method: "POST", body: JSON.stringify({
        action: "save_cycle", programId: activeProgram.id, ...(editingId ? { cycleId: editingId } : {}),
        academicYear: cycleForm.academic_year.trim(), applicationStart: cycleForm.application_start,
        applicationEnd: cycleForm.application_end, officialUrl: cycleForm.official_url.trim(),
      }) });
      setCycleId(result.guide.cycleId); setCycleMode("none"); setCycleForm(initCycle);
    }, editingId ? "Cycle changes saved as draft." : "New draft cycle created.");
  }
  function editRequirement(r?: Requirement) {
    setError("");
    setRequirementPrefilled(false);
    setShowRequirementImport(false);
    setRequirementId(r?.id || "new");
    if (!r) { setRequirementForm(initRequirement()); return; }
    setRequirementForm({
      title:r.title,description:r.description,is_required:r.is_required,
      issuingOffice:r.issuing_office ?? "",officeAddress:r.office_address ?? "",officeHours:r.office_hours ?? "",mapUrl:r.map_url ?? "",
      steps: data.steps.filter((s) => s.requirement_id === r.id).sort((a,b) => a.position-b.position).map((s) => s.instruction),
      faqs: data.faqs.filter((f) => f.requirement_id === r.id).map((f) => ({question:f.question,answer:f.answer}))
    });
  }
  function applyRequirementSuggestions(ready:RequirementSuggestion) {
    setRequirementForm(current=>({
      ...current,
      title:ready.title || current.title,
      description:ready.description || current.description,
      steps:ready.steps.filter(Boolean).length?ready.steps.filter(Boolean):current.steps,
      issuingOffice:ready.issuingOffice || current.issuingOffice,
      officeAddress:ready.officeAddress || current.officeAddress,
      officeHours:ready.officeHours || current.officeHours,
      mapUrl:ready.mapUrl || current.mapUrl
    }));
    setRequirementPrefilled(true);
  }
  async function saveRequirement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeCycle || !isDraft) return;
    if (!requirementForm.title.trim() || !requirementForm.steps.some((s)=>s.trim())) {setError("Every requirement needs a title and at least one actionable step.");return;}
    if (requirementForm.faqs.some((f) => !f.question.trim() || !f.answer.trim())) {setError("Complete both fields in every FAQ, or remove empty entries.");return;}
    if (!mapPinUrl.safeParse(requirementForm.mapUrl.trim()).success) {setError("Use a direct HTTPS Google Maps, Apple Maps or OpenStreetMap link for the pinned location.");return;}
    const editingId = requirementId !== "new" ? requirementId : null;
    if (demoMode) {
      const id = editingId || demoId("requirement");
      const position = editingId ? (cycleRequirements.find(r => r.id === id)?.position ?? cycleRequirements.length) : cycleRequirements.length;
      commitDemo(upsertDemoRequirement(data, {
        id, cycle_id: activeCycle.id, title: requirementForm.title.trim(),
        description: requirementForm.description.trim(), is_required: requirementForm.is_required, position,
        issuing_office: requirementForm.issuingOffice.trim(), office_address: requirementForm.officeAddress.trim(),
        office_hours: requirementForm.officeHours.trim(), map_url: requirementForm.mapUrl.trim(),
      }, requirementForm.steps.map(s => s.trim()).filter(Boolean), requirementForm.faqs.map(f => ({question:f.question.trim(),answer:f.answer.trim()}))));
      setRequirementId(null); setRequirementPrefilled(false);
      setError(""); setMessage("Demo requirement updated locally. No Supabase records were saved.");
      return;
    }
    await act(async () => {
      await api("/api/admin/content", { method: "POST", body: JSON.stringify({
        action: "save_requirement", cycleId: activeCycle.id, ...(editingId ? { requirementId: editingId } : {}),
        title: requirementForm.title.trim(), description: requirementForm.description.trim(), required: requirementForm.is_required,
        issuingOffice:requirementForm.issuingOffice.trim(),officeAddress:requirementForm.officeAddress.trim(),officeHours:requirementForm.officeHours.trim(),mapUrl:requirementForm.mapUrl.trim(),
        steps: requirementForm.steps.map((step) => step.trim()).filter(Boolean), faqs: requirementForm.faqs,
      }) });
      setRequirementId(null);
      setRequirementPrefilled(false);
    }, editingId ? "Requirement journey updated atomically." : "Requirement journey saved as draft.");
  }
  async function saveSource(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeCycle || !isDraft) return;
    if (sourceTitle.trim().length < 3 || !isHttpsLink(sourceUrl.trim())) {setError("Enter a source title and a valid HTTPS reference URL.");return;}
    if (demoMode) {
      const existing = data.sources.find(row => row.id === sourceId);
      const id = sourceId || demoId("source");
      const updatedText = !existing || existing.content !== sourceContent || existing.source_url !== sourceUrl.trim();
      commitDemo(upsertDemoSource(data, {
        id, cycle_id: activeCycle.id, title: sourceTitle.trim(),
        source_url: sourceUrl.trim(), content: sourceContent.trim(),
        is_approved: sourceApproved, reviewed_at: sourceApproved ? new Date().toISOString() : null,
        content_version: existing ? existing.content_version + (updatedText ? 1 : 0) : 1,
      }));
      setSourceTitle(""); setSourceUrl(""); setSourceContent(""); setSourceApproved(false); setSourceId(null);
      setError(""); setMessage("Demo reference updated in this browser tab only. Nothing saved to Supabase.");
      return;
    }
    await act(async () => {
      await api("/api/admin/content", { method: "POST", body: JSON.stringify({
        action: "save_source", cycleId: activeCycle.id, ...(sourceId ? { sourceId } : {}),
        title: sourceTitle.trim(), url: sourceUrl.trim(), content: sourceContent.trim(), approved: sourceApproved,
      }) });
      setSourceTitle(""); setSourceUrl(""); setSourceContent(""); setSourceApproved(false); setSourceId(null);
    }, "Source and reference text saved. Publication remains a separate action.");
  }
  async function requestPublish(publish = true) {
    if (!activeCycle || (publish && !preflightReady) || role !== "publisher" || demoMode) return;
    await act(async () => {
      await api("/api/admin/publish", { method: "POST", body: JSON.stringify({ cycleId: activeCycle.id, publish }) });
    }, publish ? "Guide published. Verify the applicant view." : "Cycle returned to draft for review.");
  }

  if (gate !== "ready") return (
    <AdminLoginScreen
      gate={gate}
      email={email}
      password={password}
      busy={busy}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={(event) => void signIn(event)}
      onRetry={() => void authenticate()}
      onSignOut={() => void signOut()}
    />
  );

  return <MotionConfig reducedMotion="user"><div className="admin-portal min-h-screen bg-[#f3f5f8] text-[#102a51] lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
    <aside className="admin-sidebar hidden min-h-screen overflow-y-auto border-r border-[#d7e3ef] bg-white px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <GabayBrand inverse className="mb-10 px-3"/>
      <p className="admin-sidebar-label mb-3 px-3 text-xs font-bold uppercase tracking-[.12em] text-[#53657b]">Workspace</p><LinkNav section={section} demoMode={demoMode}/>

      <div className="mt-6 border-t border-[#d7e3ef] pt-4">
        <p className="admin-sidebar-label mb-2 px-3 text-xs font-semibold uppercase tracking-[.08em] text-[#53657b]">Account</p>
        {demoMode
          ? <Link href="/admin" className="admin-account group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#cddff4] transition-colors hover:bg-[#eef6ff]"><LockKeyhole size={18} aria-hidden="true"/> Admin sign-in</Link>
          : <button onClick={() => void signOut()} className="admin-account flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#cddff4] transition-colors hover:bg-[#eef6ff]"><LogOut size={18} aria-hidden="true"/> Sign out</button>}
      </div>
      <div className="mt-auto pt-6"><div className="admin-bottom-clearance" aria-hidden="true"/></div>
    </aside>
    <div className="min-w-0">
      <div className="admin-topbar sticky top-0 z-20 border-b border-[#d7e3ef] bg-white/95 backdrop-blur-xl">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-2"><div className="lg:hidden"><GabayBrand/></div><span className="hidden text-sm font-medium text-[#53657b] lg:inline">Admin workspace</span><ChevronRight size={14} aria-hidden="true" className="hidden text-[#53657b] lg:inline"/><span className="hidden truncate text-sm font-semibold text-[#102a51] lg:inline">{info[section].label}</span></div>
          <div className="flex items-center gap-2"><span className="inline-flex rounded-full border border-[#d7e3ef] bg-[#eef6ff] px-3 py-1.5 text-xs font-semibold capitalize text-[#155bb0]">{demoMode ? "Demo preview" : role + " access"}</span>{demoMode ? <button type="button" onClick={resetDemo} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d7e3ef] bg-white px-3 text-xs font-semibold text-[#155bb0] hover:bg-[#eef6ff]">Reset demo</button> : null}{demoMode ? <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#d7e3ef] text-[#cddff4] lg:hidden" aria-label="Admin sign-in"><LockKeyhole size={18}/></Link> : <button className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#d7e3ef] text-[#cddff4] lg:hidden" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={18}/></button>}</div>
        </div>
        <div className="overflow-x-auto border-t border-[#d7e3ef] lg:hidden"><LinkNav section={section} mobile demoMode={demoMode}/></div>
      </div>
      <main className="admin-content mx-auto min-w-0 w-full max-w-[1340px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
        {!demoMode && role === "editor" && <div className="mb-5"><Notice>Read-only editor access. A publisher must save, review, and publish changes.</Notice></div>}
        {demoMode ? <div className="mb-5"><Notice>This is an <strong>interactive demo sandbox</strong> using fictional data. Draft changes are saved only in this browser tab. Nothing is sent to Supabase or published.</Notice></div> : null}
        <AnimatePresence initial={false} mode="wait">
          {error ? <motion.div key="admin-error" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}} className="mb-5"><Notice tone="error">{error}</Notice></motion.div>
           : message ? <motion.div key="admin-success" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16}} className="mb-5"><Notice tone="success">{message}</Notice></motion.div>
           : null}
        </AnimatePresence>
        <AdminWorkflow section={section} demoMode={demoMode}/>
        <AnimatePresence mode="wait"><motion.div key={section} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.18,ease:"easeOut"}}>
          {section === "overview" ? <>
            <Heading eyebrow="Content management" title="Welcome to your workspace" description="Manage the scholarship guides your team is preparing."
              action={<Link href={demoMode?"/admin/demo?view=programs&new=1":"/admin/programs/new"} className="admin-primary-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155bb0] px-4 py-2.5 text-sm font-semibold text-[#f8fbff] hover:bg-[#104a92]"><Plus size={17}/>Create guide</Link>}/>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stat(data.programs.length,"Programs",<GraduationCap size={19}/>, "All managed programs",0)}
              {stat(data.cycles.filter(c=>c.status==="draft").length,"Draft cycles",<FileText size={19}/>, "Not visible to applicants",0.055)}
              {stat(data.cycles.filter(c=>c.status==="published").length,"Published cycles",<Check size={19}/>, "Public guidance",0.11)}
              {stat(data.sources.filter(s=>!s.is_approved).length,"Sources to review",<LibraryBig size={19}/>, "Not approved for retrieval",0.165)}
            </div>
            <OperationsPanel data={data} demoMode={demoMode}/>
            <div className="mt-5">
              <Card><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Scholarship programs</h2><Link href={demoMode?"/admin/demo?view=programs":"/admin/programs"}><StepLink>Manage all</StepLink></Link></div>
                {data.programs.length ? <div className="divide-y divide-[#d7e3ef]">{data.programs.slice(0,5).map((p)=><Link key={p.id}
  href={demoMode ? "/admin/demo?view=programs&program=" + encodeURIComponent(p.id) : "/admin/programs/" + encodeURIComponent(p.id)}
  aria-label={"Open " + p.title + " program details"}
  className="group flex min-h-20 items-center justify-between gap-3 rounded-lg px-3 py-4 transition-[background-color,transform] duration-150 hover:bg-[#eef6ff] active:scale-[.997] focus-visible:outline-2 focus-visible:outline-[#155bb0]"
><div className="min-w-0"><p className="font-semibold text-[#102a51]">{p.title}</p><p className="mt-1 text-xs text-[#53657b]">{data.cycles.filter(c=>c.program_id===p.id).length} application cycle(s)</p></div><div className="flex shrink-0 items-center gap-2"><Pill status={p.status}/><ChevronRight size={18} aria-hidden="true" className="text-[#155bb0] transition-transform duration-150 group-hover:translate-x-0.5"/></div></Link>)}</div> : <Empty title="No scholarship programs" message="Create your first draft. It will remain private until publication."/>}
              </Card>
            </div>
          </> : null}

          {section === "programs" ? <>
            <Heading eyebrow="Content library" title="Scholarship guides" description="Create a guide or import an official document to start a draft."
              action={<div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled={!canEdit} aria-haspopup="dialog" onClick={()=>setShowImport(true)}>Import file</Button>
                <Button disabled={!canEdit} onClick={()=>{setProgramForm(initProgram);setImportedCycle(null);setProgramMode("new");setError("");}}><Plus size={17}/> New program</Button>
              </div>}/>
            <AdminImportDialog open={showImport} onClose={()=>setShowImport(false)} demoMode={demoMode} onApply={applyContextDraft}/>
             <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
              <div className="space-y-5">
                <Card><div className="grid gap-3 sm:grid-cols-[1fr_160px]"><ProgramSearch value={search} onChange={value=>{setSearch(value);setProgramPage(1);}} programNames={data.programs.map(p=>p.title)} scope={demoMode?"demo":"admin"}/><div><label htmlFor="program-filter" className="sr-only">Filter publication status</label><AdminSelect id="program-filter" value={filter} onChange={value=>{setFilter(value);setProgramPage(1);}} placeholder="All statuses" options={[{value:"all",label:"All statuses"},{value:"draft",label:"Draft"},{value:"published",label:"Published"},{value:"archived",label:"Archived"}]}/></div></div></Card>
                <Card className="!p-0"><div className="border-b border-[#d7e3ef] px-5 py-4 text-sm font-semibold">{filteredPrograms.length} program(s)</div>{!filteredPrograms.length ? <div className="p-5"><Empty title="No matching programs" message="Try a different search or create a draft program."/></div> : <ul className="divide-y divide-[#d7e3ef]">{visiblePrograms.map(p=><li key={p.id} className={"p-5 transition-colors hover:bg-[#f7fbff] "+(activeProgramId===p.id?"bg-[#eef6ff]":"")}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold text-[#102a51]">{p.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#53657b]">{p.description}</p><p className="mt-2 text-xs text-[#53657b]">{data.cycles.filter(c=>c.program_id===p.id).length} cycle(s)</p></div><Pill status={p.status}/></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>{setProgramId(p.id);setCycleId("");setCycleMode("none");setProgramMode("none");}}>View cycles</Button><Button variant="outline" disabled={!canEdit} onClick={()=>editProgram(p)}>Edit <ChevronRight size={15}/></Button></div></li>)}</ul>}{filteredPrograms.length>ADMIN_PAGE_SIZE?<AdminPagination page={safeAdminPage(programPage,filteredPrograms.length)} totalItems={filteredPrograms.length} label="scholarship guides" onPageChange={setProgramPage}/>:null}</Card>
              </div>
              <div className="space-y-5">
                <Card><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{programMode==="new"?"Create program":programMode==="edit"?"Edit program":"Program details"}</h2>{programMode!=="none" ? <button className="rounded-lg p-2 hover:bg-[#eef6ff]" onClick={()=>setProgramMode("none")} aria-label="Cancel editing program"><X size={18}/></button> : null}</div>
                  {programMode!=="none" ? <form className="space-y-4" onSubmit={e=>void saveProgram(e)}>
                    <Field htmlFor="program-title" label="Program name" required><input id="program-title" required maxLength={140} className={inputClass} value={programForm.title} onChange={e=>setProgramForm({...programForm,title:e.target.value})} placeholder="As shown in the official source"/></Field>
                    <Field htmlFor="program-desc" label="Program description" required><AutoTextarea id="program-desc" required minLength={10} className={areaClass} value={programForm.description} onChange={e=>setProgramForm({...programForm,description:e.target.value})} placeholder="Explain who the verified guide is for."/></Field>
                    <Button busy={busy} type="submit" disabled={!canEdit}>{programMode==="new"?"Create draft":"Save changes"}</Button>
                  </form> : activeProgram ? <><p className="text-sm leading-6 text-[#53657b]">{activeProgram.description}</p><div className="mt-4"><Pill status={activeProgram.status}/></div><Button variant="outline" className="mt-3" disabled={!canEdit} onClick={()=>editProgram(activeProgram)}>Edit program <ArrowRight size={16}/></Button></> : <Empty title="Select a program" message="Choose a program to view its cycles."/>}
                </Card>
                {activeProgram && programMode==="none" ? <Card><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Application cycles</h2><Button variant="outline" disabled={!canEdit} onClick={()=>{setCycleMode("new");setCycleForm(initCycle);}}> <Plus size={16}/> Add cycle</Button></div>
                  <div className="space-y-2">{programCycles.length ? visibleCycles.map(c=><div key={c.id} className={"rounded-xl border p-3 "+(activeCycleId===c.id?"border-[#9cbde0] bg-[#eef6ff]":"border-[#d7e3ef]")}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{c.academic_year}</span><Pill status={c.status}/></div><p className="mt-1 text-xs text-[#53657b]">{c.application_start && c.application_end ? formatDate(c.application_start)+" – "+formatDate(c.application_end) : "Application dates unverified"}</p><div className="mt-2 flex gap-2"><Button onClick={()=>{setCycleId(c.id);setCycleMode("none");}}>Select</Button><Button variant="outline" onClick={()=>editCycle(c)} disabled={c.status!=="draft" || !canEdit}>Edit</Button></div></div>) : <p className="text-sm text-[#53657b]">No cycles yet. Add a draft academic-year guide.</p>}</div><AdminPagination page={safeAdminPage(cyclePage,programCycles.length)} totalItems={programCycles.length} label="application cycles" onPageChange={setCyclePage}/>
                  {cycleMode!=="none" ? <form className="mt-5 space-y-4 border-t border-[#d7e3ef] pt-5" onSubmit={e=>void saveCycle(e)}>
                    <h3 className="font-semibold">{cycleMode==="new"?"New cycle":"Edit draft cycle"}</h3>
                    <Field htmlFor="cycle-year" label="Academic year / cycle" required><input id="cycle-year" className={inputClass} value={cycleForm.academic_year} onChange={e=>setCycleForm({...cycleForm,academic_year:e.target.value})} placeholder="Only use a verified cycle" required/></Field>
                    <div className="grid gap-3 sm:grid-cols-2"><Field htmlFor="cycle-start" label="Verified start date"><input id="cycle-start" type="date" className={inputClass} value={cycleForm.application_start} onChange={e=>setCycleForm({...cycleForm,application_start:e.target.value})}/></Field><Field htmlFor="cycle-end" label="Verified end date"><input id="cycle-end" type="date" className={inputClass} value={cycleForm.application_end} onChange={e=>setCycleForm({...cycleForm,application_end:e.target.value})}/></Field></div>
                    <Field htmlFor="cycle-url" label="Official portal URL" hint="HTTPS only; confirm the destination from an authoritative source."><input id="cycle-url" type="url" className={inputClass} value={cycleForm.official_url} onChange={e=>setCycleForm({...cycleForm,official_url:e.target.value})} placeholder="https://…"/></Field>
                    <div className="flex flex-wrap gap-2"><Button type="submit" busy={busy} disabled={!canEdit}>Save draft cycle</Button><Button type="button" variant="quiet" onClick={()=>setCycleMode("none")}>Cancel</Button></div>
                  </form> : null}
                </Card> : null}
              </div>
            </div>
          </> : null}

          {section === "requirements" ? <>
            <Heading eyebrow="Preparation guidance" title="Requirements & FAQs" description="Step 2: Select a guide and add documents students need, clear preparation steps, and common questions."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={id=>{setProgramId(id);setCyclePage(1);setRequirementPage(1);setSourcePage(1);}} onCycle={id=>{setCycleId(id);setRequirementPage(1);setSourcePage(1);}}/>
            {!activeCycle ? <Empty title="No application cycle selected" message="Create or choose an application cycle before adding requirements."><Link href={demoMode ? "/admin/demo?view=programs" : "/admin/programs"}><StepLink>Manage scholarship programs</StepLink></Link></Empty> : <div className="grid gap-5 xl:grid-cols-[minmax(260px,.8fr)_minmax(0,1.3fr)]">
              <Card className="self-start"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">Checklist items</h2><Pill status={activeCycle.status}/></div><div className="space-y-2">{visibleRequirements.map((r,index)=><button key={r.id} className={"flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors "+(requirementId===r.id?"border-[#9cbde0] bg-[#eef6ff]":"border-[#d7e3ef] hover:bg-[#eef6ff]")} onClick={()=>editRequirement(r)}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef6ff] text-xs font-bold text-[#155bb0]">{(safeAdminPage(requirementPage,cycleRequirements.length)-1)*ADMIN_PAGE_SIZE+index+1}</span><span className="flex-1 font-semibold">{r.title}</span><ChevronRight size={15} className="shrink-0"/></button>)}{!cycleRequirements.length ? <p className="py-4 text-sm leading-6 text-[#53657b]">No requirements yet. Add the first item for this cycle.</p> : null}</div><AdminPagination page={safeAdminPage(requirementPage,cycleRequirements.length)} totalItems={cycleRequirements.length} label="requirements" onPageChange={setRequirementPage}/>{isDraft ? <Button className="mt-5 w-full" variant="outline" disabled={!canEdit} onClick={()=>editRequirement()}><Plus size={16}/> Add requirement</Button> : <p className="mt-4 text-xs leading-5 text-[#7b6d4e]">Published cycles are read-only here. Use a versioned update workflow.</p>}</Card>
              <Card>{!requirementId ? <Empty title="Select a requirement" message="Choose a checklist item or create a new one. Each item needs actionable steps and approved source backing."/> : <form onSubmit={e=>void saveRequirement(e)} className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{requirementId==="new"?"New requirement":"Edit requirement"}</h2>
                  <div className="flex items-center gap-2">
                    {isDraft && canEdit && <Button type="button" variant="outline" onClick={()=>setShowRequirementImport(true)}><FileUp size={16}/> Import text / file</Button>}
                    <button type="button" onClick={()=>{setRequirementId(null);setRequirementPrefilled(false);}} className="rounded-lg p-2 hover:bg-[#eef6ff]" aria-label="Close requirement editor"><X size={18}/></button>
                  </div>
                </div>
                {showRequirementImport ? <RequirementImportDialog open onClose={()=>setShowRequirementImport(false)} onApply={applyRequirementSuggestions}/> : null}
                {requirementPrefilled && <p role="status" className="rounded-xl border border-[#c5d9ef] bg-[#f0f6fc] px-4 py-3 text-sm text-[#102a51]">Suggestions are copied to the draft editor. Review and select Save requirement draft to persist changes.</p>}
                {!isDraft ? <Notice>Published requirements are read-only. Create a new version with the backend publishing workflow.</Notice> : null}
                <Field htmlFor="req-title" label="Requirement title" required><input id="req-title" className={inputClass} value={requirementForm.title} onChange={e=>setRequirementForm({...requirementForm,title:e.target.value})} required disabled={!isDraft || !canEdit}/></Field>
                <Field htmlFor="req-desc" label="Why this document is needed" hint="Only include claims supported by an approved reference."><AutoTextarea id="req-desc" className={areaClass} value={requirementForm.description} onChange={e=>setRequirementForm({...requirementForm,description:e.target.value})} disabled={!isDraft || !canEdit}/></Field>
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={requirementForm.is_required} onChange={e=>setRequirementForm({...requirementForm,is_required:e.target.checked})} className="h-5 w-5 accent-[#155bb0]" disabled={!isDraft || !canEdit}/> Required for this cycle (uncheck if conditional)</label>
                <fieldset disabled={!isDraft || !canEdit} className="space-y-3 border-t border-[#d7e3ef] pt-5">
                  <legend className="inline-flex items-center gap-2 pb-2 text-base font-semibold text-[#102a51]"><MapPin size={19} className="text-[#155bb0]"/> Where to get this document</legend>
                  <p className="text-xs leading-5 text-[#53657b]">Optional issuing-office details. Verify the office and pinned map link before publishing.</p>
                  <Field htmlFor="req-office" label="Issuing office"><input id="req-office" maxLength={160} className={inputClass} value={requirementForm.issuingOffice} onChange={event=>setRequirementForm(old=>({...old,issuingOffice:event.target.value}))} placeholder="e.g., University Registrar"/></Field>
                  <Field htmlFor="req-address" label="Full office address"><AutoTextarea id="req-address" className={areaClass} value={requirementForm.officeAddress} onChange={event=>setRequirementForm(old=>({...old,officeAddress:event.target.value}))} placeholder="Verified street address, city and province"/></Field>
                  <Field htmlFor="req-hours" label="Office hours"><input id="req-hours" maxLength={240} className={inputClass} value={requirementForm.officeHours} onChange={event=>setRequirementForm(old=>({...old,officeHours:event.target.value}))} placeholder="e.g., Mon–Fri, 8:00 AM–5:00 PM"/></Field>
                  <Field htmlFor="req-map" label="Pinned map URL" hint="Paste the exact Google Maps, Apple Maps or OpenStreetMap location link. No pin is guessed automatically."><input id="req-map" type="url" maxLength={2000} className={inputClass} value={requirementForm.mapUrl} onChange={event=>setRequirementForm(old=>({...old,mapUrl:event.target.value}))} placeholder="https://www.google.com/maps/..."/></Field>
                  {requirementForm.mapUrl.trim() && mapPinUrl.safeParse(requirementForm.mapUrl).success &&
                    <a href={requirementForm.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#155bb0] underline underline-offset-4"><MapPin size={16}/> Preview pinned location</a>}
                </fieldset>
                <div className="border-t border-[#d7e3ef] pt-6">
                  <StepBuilder
                    key={activeCycleId+":"+requirementId}
                    steps={requirementForm.steps}
                    disabled={!isDraft || !canEdit}
                    onChange={steps=>setRequirementForm(prev=>({...prev,steps}))}
                  />
                </div>
                <fieldset className="space-y-3 border-t border-[#d7e3ef] pt-5"><legend className="text-base font-semibold">Frequently asked questions</legend>
                  {requirementForm.faqs.map((f,index)=><div className="rounded-xl border border-[#d7e3ef] bg-[#f7fbff] p-3" key={index}><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">FAQ {index+1}</span>{isDraft?<button type="button" aria-label={"Remove FAQ "+(index+1)} onClick={()=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.filter((_,i)=>i!==index)}))} className="rounded-lg p-2 hover:bg-[#f4eae8]"><X size={16}/></button>:null}</div><label htmlFor={"faq-q-"+index} className="block text-xs font-medium">Question</label><input id={"faq-q-"+index} className={inputClass} value={f.question} disabled={!isDraft || !canEdit} onChange={e=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.map((a,i)=>i===index?{...a,question:e.target.value}:a)}))}/><label htmlFor={"faq-a-"+index} className="mt-3 block text-xs font-medium">Answer</label><AutoTextarea id={"faq-a-"+index} className={areaClass} value={f.answer} disabled={!isDraft || !canEdit} onChange={e=>setRequirementForm(prev=>({...prev,faqs:prev.faqs.map((a,i)=>i===index?{...a,answer:e.target.value}:a)}))}/></div>)}
                  {isDraft ? <Button type="button" variant="outline" onClick={()=>setRequirementForm({...requirementForm,faqs:[...requirementForm.faqs,{question:"",answer:""}]})}><Plus size={16}/> Add FAQ</Button> : null}
                </fieldset>
                {isDraft ? <div className="flex flex-wrap gap-2 border-t border-[#d7e3ef] pt-5"><Button type="submit" busy={busy} disabled={!canEdit}>Save requirement draft</Button><Button type="button" variant="quiet" onClick={()=>setRequirementId(null)}>Cancel</Button></div>:null}
              </form>}</Card>
            </div>}
          </> : null}

          {section === "knowledge" ? <>
            <Heading eyebrow="Reference governance" title="Knowledge & sources" description="Store reference text, verify its source, and approve it before publication."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={id=>{setProgramId(id);setCyclePage(1);setRequirementPage(1);setSourcePage(1);}} onCycle={id=>{setCycleId(id);setRequirementPage(1);setSourcePage(1);}}/>
            {!activeCycle ? <Empty title="Choose an application cycle" message="Create a cycle before managing its reference sources."/> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.8fr)]">
              <Card><h2 className="mb-4 text-lg font-semibold">Reference register</h2>
                {!cycleSources.length ? <Empty title="No sources attached" message="Add official reference text for human review."/> : <div className="divide-y divide-[#e5ede5]">{visibleSources.map(s=><article key={s.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{s.title}</h3><Pill status={s.is_approved?"approved":"in review"}/></div><p className="mt-2 text-xs leading-5">Version {s.content_version} ? Reviewed {formatDate(s.reviewed_at?s.reviewed_at.slice(0,10):null)}</p>{s.source_url && isHttpsLink(s.source_url) && <a className="mt-3 inline-block text-sm underline" href={s.source_url} target="_blank" rel="noopener noreferrer">Open reference</a>}<p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-[#53657b]">{s.content || "No reference text saved yet."}</p><Button className="mt-3" variant="outline" disabled={!isDraft || !canEdit} onClick={()=>{setSourceId(s.id);setSourceTitle(s.title);setSourceUrl(s.source_url || "");setSourceContent(s.content || "");setSourceApproved(s.is_approved);}}>Edit source and review</Button></article>)}</div>}
                <AdminPagination page={safeAdminPage(sourcePage,cycleSources.length)} totalItems={cycleSources.length} label="sources" onPageChange={setSourcePage}/>
              </Card>
              <Card className="self-start"><h2 className="text-lg font-semibold">{sourceId ? "Review reference" : "Attach a reference"}</h2><p className="mt-2 text-sm leading-6 text-[#53657b]">Adding a link alone does not supply evidence. Save the reference text and confirm your review.</p>
                <form className="mt-5 space-y-4" onSubmit={e=>void saveSource(e)}><fieldset disabled={!isDraft || !canEdit || busy} className="space-y-4">
                  <Field htmlFor="source-title" label="Source title" required><input id="source-title" className={inputClass} required value={sourceTitle} onChange={e=>{setSourceTitle(e.target.value);setSourceApproved(false);}}/></Field>
                  <Field htmlFor="source-url" label="Official HTTPS link" required><input id="source-url" className={inputClass} type="url" required value={sourceUrl} onChange={e=>{setSourceUrl(e.target.value);setSourceApproved(false);}}/></Field>
                  <Field htmlFor="source-content" label="Reference text"><AutoTextarea id="source-content" className={areaClass} rows={6} maxLength={30000} value={sourceContent} onChange={e=>{setSourceContent(e.target.value);setSourceApproved(false);}}/></Field>
                  <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={sourceApproved} onChange={e=>setSourceApproved(e.target.checked)}/>I have reviewed this source and verified that it supports the guidance.</label>
                  <Button type="submit" busy={busy} disabled={!canEdit}>Save source and review</Button>
                </fieldset></form><div className="mt-4"><Notice>Changing reference text clears the approval checkbox. Saving a source does not publish the guide.</Notice></div>
              </Card>
            </div>}
          </> : null}

          {section === "preview" ? <>
            <Heading eyebrow="Publication readiness" title="Review & publish" description="Step 4: Review student-facing content and what still needs attention before publication."/>
            <SelectScope data={data} programId={activeProgramId} cycleId={activeCycleId} onProgram={id=>{setProgramId(id);setCyclePage(1);setRequirementPage(1);setSourcePage(1);}} onCycle={id=>{setCycleId(id);setRequirementPage(1);setSourcePage(1);}}/>
            {!activeCycle ? <Empty title="No cycle to preview" message="Select or create a draft cycle, then return here for pre-publication checks."/> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.85fr)]">
              <Card>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-widest text-[#155bb0]">Student-facing content preview</p><h2 className="mt-2 text-xl font-semibold">{activeProgram?.title}</h2><p className="mt-1 text-sm text-[#53657b]">{activeCycle.academic_year}</p></div>
                  <Pill status={activeCycle.status}/>
                </div>
                <ApplicantContentPreview data={data} program={activeProgram} cycle={activeCycle}/>
                <p className="mt-4 text-xs leading-5 text-[#53657b]">Preview limitation: Education-level and applicant-classification metadata are not yet supplied by the public scholarship API. Confirm the live published page after publication.</p>
              </Card>
              <Card className="self-start"><h2 className="text-lg font-semibold">Publication checklist</h2><p className="mt-2 text-xs leading-5 text-[#53657b]">{demoMode ? "Demo preview cannot publish." : checkingReadiness ? "Checking the saved guide on the server..." : "These checks use the current saved database records."}</p><ul className="mt-5 space-y-4">{checks.map(c=>{const fixSection = c.name.includes("Publisher authorization") ? null : c.name.toLowerCase().includes("source") ? "knowledge" : c.name.toLowerCase().includes("requirement") ? "requirements" : "programs"; return <li key={c.name} className="flex items-start gap-3 text-sm"><span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full "+(c.ok?"bg-[#e3f3e5] text-[#25734a]":"bg-[#fff0dd] text-[#8c5f22]")}>{c.ok?<Check size={13}/>:<X size={12}/>}</span><span className="leading-6">{c.name}{!c.ok && fixSection && <Link className="mt-1 block text-xs font-semibold text-[#155bb0] underline underline-offset-4" href={demoMode ? "/admin/demo?view="+fixSection : "/admin/"+fixSection}>Open editor to fix <ArrowRight size={13} className="inline" aria-hidden="true"/></Link>}</span></li>;})}</ul><div className="mt-6 border-t border-[#d7e3ef] pt-5"><Button className="w-full" disabled={!preflightReady || busy} busy={busy} onClick={()=>void requestPublish()}><ShieldCheck size={17}/> Publish verified guide</Button>{activeCycle.status === "published" && <Button variant="outline" className="mt-3 w-full" disabled={!canEdit || demoMode || busy} onClick={()=>void requestPublish(false)}>Return cycle to draft</Button>}<p className="mt-3 text-xs leading-5 text-[#53657b]">Only publishers can save and publish. The database validates publication again in one transaction.</p></div><div className="mt-4"><Notice>Review and save reference text in Knowledge sources before publishing. Return a published cycle to draft before editing its requirements.</Notice></div></Card>
            </div>}
          </> : null}
        </motion.div></AnimatePresence>
        <footer className="mt-10 border-t border-[#d7e3ef] pt-5 text-xs leading-6 text-[#53657b]">GabayIskolar is an independent prototype, not a Pasig City Government service. Scholarship decisions and submissions belong to the official office.</footer>
      </main>
    </div>
  </div></MotionConfig>;
}
