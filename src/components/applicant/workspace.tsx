"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  MessageCircle,
  ScanText,
  X,
  Waves,
  ArrowRight,
  Info,
  AlertCircle,
} from "lucide-react";
import { demoGuide } from "@/lib/applicant/fixtures";
import { fetchGuide } from "@/lib/applicant/api";
import { toast } from "@/components/ui/toast";
import {
  OFFICIAL_PORTAL,
  reconcile,
  signature,
  statusLabels,
  storageKey,
  type Preferences,
  type Guide,
  type Progress,
  type Cycle,
  type Status,
} from "@/lib/applicant/model";
import "./applicant.css";

const preferenceKey = "gabayiskolar:preferences:v1";
type Workspace = {
  preferences: Preferences | null;
  ready: boolean;
  select: (p: Preferences) => void;
  guide: Guide | null;
  cycle?: Cycle;
  loading: boolean;
  error: string;
  storageWarning: string;
  retry: () => void;
  visit: { documentsChecked: number; asked: boolean };
  recordDocumentCheck: () => void;
  recordQuestion: () => void;
  preparationRevision: number;
  refreshPreparation: () => void;
};
const WorkspaceContext = createContext<Workspace | null>(null);
export function ApplicantProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [ready, setReady] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [revision, setRevision] = useState(0);
  const [preparationRevision, setPreparationRevision] = useState(0);
  const refreshPreparation = useCallback(() => setPreparationRevision((v) => v + 1), []);
  const [visitState, setVisitState] = useState({ cycleId: "", documentsChecked: 0, asked: false });
  const selectedCycle = preferences?.cycleId ?? "";
  const visit = visitState.cycleId === selectedCycle ? visitState : { documentsChecked: 0, asked: false };
  useEffect(() => {
    setVisitState({ cycleId: selectedCycle, documentsChecked: 0, asked: false });
  }, [selectedCycle]);
  const recordDocumentCheck = useCallback(() => {
    setVisitState((v) => ({ cycleId: selectedCycle, documentsChecked: (v.cycleId === selectedCycle ? v.documentsChecked : 0) + 1, asked: v.cycleId === selectedCycle && v.asked }));
  }, [selectedCycle]);
  const recordQuestion = useCallback(() => {
    setVisitState((v) => ({ cycleId: selectedCycle, documentsChecked: v.cycleId === selectedCycle ? v.documentsChecked : 0, asked: true }));
  }, [selectedCycle]);
  useEffect(() => {
    try {
      const p: unknown = JSON.parse(
        localStorage.getItem(preferenceKey) ?? "null",
      );
      if (
        p &&
        typeof p === "object" &&
        "programId" in p &&
        typeof p.programId === "string" &&
        "cycleId" in p &&
        typeof p.cycleId === "string" &&
        "level" in p &&
        typeof p.level === "string" &&
        "applicantType" in p &&
        typeof p.applicantType === "string"
      )
        setPreferences(p as Preferences);
    } catch {
      setStorageWarning(
        "Browser storage is unavailable. Your preparation may reset when you leave.",
      );
    }
    setReady(true);
  }, []);
  const select = useCallback((p: Preferences) => {
    setPreferences(p);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(p));
    } catch {
      setStorageWarning(
        "Changes are only available for this visit because browser storage is unavailable.",
      );
    }
  }, []);
  const programId = preferences?.programId;
  useEffect(() => {
    setGuide(null);
    setError("");
    setLoading(false);
    if (!programId) return;
    if (programId === demoGuide.id) {
      setGuide(demoGuide);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchGuide(programId, controller.signal)
      .then(setGuide)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load your guide.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [programId, revision]);
  const cycle = useMemo(
    () => guide?.cycles.find((c) => c.id === preferences?.cycleId),
    [guide, preferences?.cycleId],
  );
  return (
    <WorkspaceContext.Provider
      value={{
        preferences,
        ready,
        select,
        guide,
        cycle,
        loading,
        error,
        storageWarning,
        visit,
        recordDocumentCheck,
        recordQuestion,
        preparationRevision,
        refreshPreparation,
        retry: () => setRevision((v) => v + 1),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("ApplicantProvider is required");
  return value;
}
export function usePreparation(cycle: Cycle | undefined) {
  const { preparationRevision, refreshPreparation } = useWorkspace();
  const [entries, setEntries] = useState<Progress>({});
  const [ready, setReady] = useState(false);
  const [loadedCycle, setLoadedCycle] = useState<Cycle | undefined | null>(
    null,
  );
  const [warning, setWarning] = useState("");
  useEffect(() => {
    setReady(false);
    const next: Progress = {};
    for (const requirement of cycle?.requirements ?? []) {
      try {
        next[requirement.id] = reconcile(
          requirement,
          JSON.parse(
            localStorage.getItem(storageKey(cycle!.id, requirement.id)) ??
              "null",
          ),
          cycle?.sources,
        );
      } catch {
        next[requirement.id] = reconcile(requirement, null, cycle?.sources);
        setWarning(
          "Your browser could not restore some progress. Please check each item.",
        );
      }
    }
    setEntries(next);
    setLoadedCycle(cycle);
    setReady(true);
  }, [cycle, preparationRevision]);
  function update(id: string, status: Status) {
    if (!cycle) return;
    const requirement = cycle.requirements.find((r) => r.id === id);
    if (!requirement) return;
    const entry = { status, signature: signature(requirement, cycle.sources) };
    setEntries((e) => ({ ...e, [id]: entry }));
    try {
      localStorage.setItem(storageKey(cycle.id, id), JSON.stringify(entry));
      refreshPreparation();
      if (status === "prepared") toast.add({ title: "Marked as prepared", description: requirement.title, type: "success" });
      else toast.add({ title: "Status updated", description: `${requirement.title}: ${statusLabels[status]}`, type: "info" });
    } catch {
      setWarning("This status could not be saved. It may reset after refresh.");
      toast.add({ title: "Status not saved", description: "It may reset after refresh.", type: "warning" });
    }
  }
  const changed = (cycle?.requirements ?? []).filter(
    (r) =>
      entries[r.id] && entries[r.id].signature !== signature(r, cycle?.sources),
  );
  return {
    entries,
    ready: ready && loadedCycle === cycle,
    warning,
    update,
    changed,
  };
}
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${inverse ? " inverse" : ""}`}
      aria-label="GabayIskolar home"
    >
      <span className="brand-mark">
        <BookOpen size={23} />
        <Waves size={14} />
      </span>
      <span>
        GabayIskolar<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function OfficialLink({
  children = "Official scholarship portal",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={OFFICIAL_PORTAL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warning" | "error";
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : undefined}
    >
      {tone === "error" ? <AlertCircle size={18} /> : <Info size={18} />}
      <div>{children}</div>
    </div>
  );
}
export function DemoNotice() {
  return (
    <Notice tone="warning">
      <strong>Illustrative walkthrough.</strong> These sample documents and
      program details are not official scholarship guidance. Confirm current
      requirements at the official portal.
    </Notice>
  );
}
export function Loading({
  label = "Loading your preparation…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <span className="sr-only">{label}</span>
      <div className="skeleton short" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Empty({
  title = "Let’s start your preparation",
  detail = "Choose a guide to make a checklist that belongs to your selected cycle.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <section className="empty-state">
      <span className="empty-icon">
        <BookOpen size={32} />
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <Link className="btn primary" href="/onboarding">
        Find my guide
        <ArrowRight size={17} />
      </Link>
      <OfficialLink className="text-link" />
    </section>
  );
}
const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scholarships", label: "Scholarships", icon: BookOpen },
  { href: "/my-checklist", label: "My checklist", icon: ClipboardCheck },
  { href: "/application-draft", label: "Private draft", icon: ClipboardCheck },
  { href: "/document-review", label: "Check a document", icon: ScanText },
  { href: "/assistant", label: "Ask Gabay", icon: MessageCircle },
  { href: "/summary", label: "Official step", icon: ArrowUpRight },
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { storageWarning } = useWorkspace();
  return (
    <div
      className="applicant-ui workspace"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          e.currentTarget
            .querySelector<HTMLButtonElement>(".workspace-mobile button")
            ?.focus();
        }
      }}
    >
      <a className="skip-link" href="#applicant-main">
        Skip to content
      </a>
      <header className="workspace-mobile">
        <Brand />
        <button
          className="icon-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="student-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={`student-sidebar${open ? " is-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand inverse />
        </div>
        <p className="sidebar-caption">Your preparation space</p>
        <nav id="student-navigation" aria-label="Student workspace">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || path.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
              className={
                path === href || path.startsWith(href + "/") ? "active" : ""
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Here to help you prepare.
            <br />
            The next official step is yours.
          </p>
          <OfficialLink />
          <Link href="/" onClick={() => setOpen(false)}>
            Back to home
          </Link>
        </div>
      </aside>
      <div className="student-content">
        <header className="workspace-top">
          <span>Scholarship preparation, at your pace</span>
          <span className="guest-label">
            Guest workspace · This browser only
          </span>
        </header>
        <main id="applicant-main" className="workspace-main">
          {storageWarning && <Notice tone="warning">{storageWarning}</Notice>}
          {children}
        </main>
        <footer className="workspace-footer">
          Independent prototype by The Prompters · OVERCLOCK 2026. Preparation
          does not determine eligibility or approval.
        </footer>
      </div>
    </div>
  );
}
