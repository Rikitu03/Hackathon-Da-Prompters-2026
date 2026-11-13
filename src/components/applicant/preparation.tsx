"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  MessageCircle,
  MapPin, ExternalLink,
  ScanText,
} from "lucide-react";
import {
  OFFICIAL_PORTAL,
  progressOf,
  STATUSES,
  statusLabels,
  type Requirement,
  type Status,
} from "@/lib/applicant/model";
import { closedCycleNotice, cycleWindow } from "@/lib/cycle-window";
import { JourneyRail } from "./journey";
import { useGabay } from "./gabay-context";
import { request, requirementFrom } from "@/lib/applicant/api";
import type { RequirementRow } from "@/lib/guides/data";
import {
  DemoNotice,
  Empty,
  Loading,
  Notice,
  OfficialLink,
  usePreparation,
  useWorkspace,
} from "./workspace";
import { Sources, useGuide } from "./catalogue";
import { DocumentCheckPanel } from "./verification/document-check";
import { DocumentTrio } from "./verification/document-trio";
import { VerificationChip } from "./verification/verification-chip";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>
      {status === "prepared" && <Check size={13} />}
      {statusLabels[status]}
    </span>
  );
}
export function StatusSelect({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: Status;
  onChange: (s: Status) => void;
}) {
  return (
    <label className="status-control">
      <span className="sr-only">Preparation status for {title}</span>
      <select
        id={`status-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
function ProgressBar({
  prepared,
  total,
  percent,
}: {
  prepared: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="progress-block">
      <div>
        <strong>My preparation progress</strong>
        <span>{percent}%</span>
      </div>
      <progress
        aria-label="Prepared requirements"
        value={prepared}
        max={total || 1}
      />
      <p>
        {prepared} of {total} {total === 1 ? "item" : "items"} prepared by you ·
        This is not official verification.
      </p>
    </div>
  );
}
function WorkspaceGate() {
  const w = useWorkspace();
  if (!w.ready || w.loading) return <Loading />;
  if (w.error)
    return (
      <Notice tone="error">
        <p>{w.error}</p>
        <button className="btn secondary compact" onClick={w.retry}>
          Try loading again
        </button>
        <Link className="text-link" href="/onboarding">
          Choose another guide
        </Link>
      </Notice>
    );
  return (
    <Empty
      title={
        w.preferences
          ? "This cycle is no longer available"
          : "Your scholarship journey starts here"
      }
      detail={
        w.preferences
          ? "Your saved cycle may have changed or been archived. Choose a currently published guide to continue."
          : "Choose a guide, get a clear checklist, and take your preparation one step at a time."
      }
    />
  );
}
export function Dashboard() {
  const { guide, cycle, preferences } = useWorkspace();
  const prep = usePreparation(cycle);
  if (!guide || !cycle)
    return (
      <>
        <JourneyRail current={null} />
        <div className="page-heading">
          <h1>Welcome to your preparation space.</h1>
          <p>A little guidance, whenever you need it.</p>
        </div>
        <WorkspaceGate />
      </>
    );
  if (!prep.ready)
    return <Loading label="Restoring your preparation progress…" />;
  const progress = progressOf(cycle.requirements, prep.entries);
  const outstanding = cycle.requirements.filter(
    (r) => prep.entries[r.id]?.status !== "prepared",
  );
  return (
    <>
      <JourneyRail current={null} />
      {guide.demo && <DemoNotice />}
      <section className="dashboard-welcome">
        <div>
          <h1>Welcome back, future scholar.</h1>
          <p>Big plans. Small steps. Let’s keep moving forward.</p>
          <span>
            {preferences?.level} · {preferences?.applicantType}
          </span>
        </div>
        <Image
          src="/illustrations/students-pasig.png"
          alt=""
          width={320}
          height={240}
          priority
        />
      </section>
      <div className="surface">
        <ProgressBar {...progress} />
      </div>
      {prep.warning && <Notice tone="warning">{prep.warning}</Notice>}
      <div className="dashboard-columns">
        <section className="surface current-guide">
          <BookOpen size={26} />
          <h2>Your selected guide</h2>
          <h3>{guide.title}</h3>
          <p>{cycle.year}</p>
          <div className="inline-actions">
            <Link href="/my-checklist" className="btn primary">
              Continue preparing
              <ArrowRight size={17} />
            </Link>
            <Link className="text-link" href="/onboarding">
              Change guide
            </Link>
          </div>
        </section>
        <section className="surface">
          <h2>Your next steps</h2>
          {!prep.ready ? (
            <Loading />
          ) : outstanding.length ? (
            <ul className="attention-list">
              {outstanding.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/requirements/${r.id}?program=${guide.id}&cycle=${cycle.id}`}
                  >
                    <span>
                      {r.title}
                      <small>
                        {prep.entries[r.id]?.status === "needs-review"
                          ? "Take another look at this item"
                          : "Open the guide to continue"}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="all-prepared">
              <Check size={26} />
              <h3>Your checklist is prepared.</h3>
              <p>
                Give your documents a final check before taking the official
                next step.
              </p>
              <Link className="text-link" href="/summary">
                See preparation summary
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <section className="workspace-tools">
        <h2>A little help along the way</h2>
        <div>
          {[
            {
              href: "/scholarships",
              icon: BookOpen,
              title: "Explore guides",
              copy: "Find your next starting point.",
            },
            {
              href: "/my-checklist",
              icon: ClipboardCheck,
              title: "My checklist",
              copy: "Keep your preparation organized.",
            },
            {
              href: "/document-review",
              icon: ScanText,
              title: "Check a document",
              copy: "Check the details against your original.",
            },
          ].map(({ href, icon: Icon, title, copy }) => (
            <Link href={href} key={href}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{copy}</p>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
export function Checklist() {
  const { guide, cycle } = useWorkspace();
  const prep = usePreparation(cycle);
  if (!guide || !cycle)
    return (
      <>
        <JourneyRail current="checklist" />
        <div className="page-heading">
          <h1>My preparation checklist</h1>
          <p>Your next step, one document at a time.</p>
        </div>
        <WorkspaceGate />
      </>
    );
  if (!prep.ready)
    return <Loading label="Restoring your preparation progress…" />;
  const progress = progressOf(cycle.requirements, prep.entries);
  return (
    <>
      <JourneyRail current="checklist" />
      <div className="page-heading heading-actions">
        <div>
          <h1>My preparation checklist</h1>
          <p>
            {guide.title} · {cycle.year}
          </p>
        </div>
        <Link className="text-link" href="/onboarding">
          Change guide
        </Link>
      </div>
      {guide.demo && <DemoNotice />}
      {guide.scope && <Notice>{guide.scope}</Notice>}
      <section className="surface">
        <ProgressBar {...progress} />
      </section>
      {prep.warning && <Notice tone="warning">{prep.warning}</Notice>}
      {!!prep.changed.length && (
        <Notice tone="warning">
          This guide has changed. Review the updated instructions before setting
          those items to prepared again.
        </Notice>
      )}
      <DocumentTrio cycleId={cycle.id} />
      {!prep.ready ? (
        <Loading />
      ) : cycle.requirements.length ? (
        <section
          className="checklist-list"
          aria-label="Preparation requirements"
        >
          {cycle.requirements.map((r, i) => (
            <article className="checklist-row" key={r.id}>
              <span
                className={`checklist-number ${prep.entries[r.id]?.status === "prepared" ? "done" : ""}`}
              >
                {prep.entries[r.id]?.status === "prepared" ? (
                  <Check size={19} />
                ) : (
                  i + 1
                )}
              </span>
              <div className="checklist-description">
                <Link
                  href={`/requirements/${r.id}?program=${guide.id}&cycle=${cycle.id}`}
                >
                  <h2>{r.title}</h2>
                </Link>
                <p>{r.description}</p>
                <VerificationChip cycleId={cycle.id} programId={guide.id} requirement={r} />
                <Link
                  href={`/requirements/${r.id}?program=${guide.id}&cycle=${cycle.id}`}
                  className="text-link"
                >
                  Read preparation steps
                  <ArrowRight size={15} />
                </Link>
              </div>
              <StatusSelect
                id={r.id}
                title={r.title}
                value={prep.entries[r.id]?.status ?? "not-started"}
                onChange={(s) => prep.update(r.id, s)}
              />
            </article>
          ))}
        </section>
      ) : (
        <Notice>
          There are no published preparation items yet. Check the official
          portal for current requirements.
        </Notice>
      )}
      <div className="checklist-bottom">
        <p className="helper" role="status">
          {progress.total - progress.prepared}{" "}
          {progress.total - progress.prepared === 1
            ? "item needs"
            : "items need"}{" "}
          your attention. Changes save automatically on this browser.
        </p>
        <Link href="/summary" className="btn primary">
          Review my preparation
          <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
export function RequirementDetail({
  id,
  programId,
  cycleId,
}: {
  id: string;
  programId?: string;
  cycleId?: string;
}) {
  const { openChat } = useGabay();
  const w = useWorkspace();
  const selectedProgram = programId ?? w.preferences?.programId ?? "";
  const data = useGuide(selectedProgram);
  const [direct, setDirect] = useState<Requirement | null>(null),
    [directError, setDirectError] = useState("");
  useEffect(() => {
    if (selectedProgram) return;
    const c = new AbortController();
    request<{ requirement: RequirementRow }>(
      `/api/requirements/${encodeURIComponent(id)}`,
      { signal: c.signal },
      "Requirement guide",
    )
      .then((d) => setDirect(requirementFrom(d.requirement)))
      .catch((e) => {
        if (!c.signal.aborted)
          setDirectError(
            e instanceof Error ? e.message : "Requirement not available.",
          );
      });
    return () => c.abort();
  }, [id, selectedProgram]);
  const cycle =
    data.guide?.cycles.find(
      (c) => c.id === (cycleId ?? w.preferences?.cycleId),
    ) ?? (!cycleId ? data.guide?.cycles[0] : undefined);
  const requirement =
    cycle?.requirements.find((r) => r.id === id) ??
    (!selectedProgram ? direct : null);
  const prep = usePreparation(cycle);
  function selectContext() {
    if (data.guide && cycle)
      w.select({ level: w.preferences?.level ?? data.guide.level ?? "Not specified", applicantType: w.preferences?.applicantType ?? "New applicant", programId: data.guide.id, cycleId: cycle.id });
  }
  if (
    (selectedProgram && data.loading) ||
    (!selectedProgram && !direct && !directError)
  )
    return <Loading />;
  if (!requirement)
    return (
      <>
        <Link className="back-link" href="/scholarships">
          <ArrowLeft size={16} />
          Scholarship guides
        </Link>
        <Notice tone="error">
          <h1>Requirement unavailable</h1>
          <p>
            {data.error ||
              directError ||
              "This item is not part of the selected published cycle, or is no longer accessible."}
          </p>
          <Link href="/scholarships" className="btn secondary compact">
            Find a published guide
          </Link>
        </Notice>
      </>
    );
  return (
    <>
      <JourneyRail current="checklist" />
      <Link
        className="back-link"
        href={data.guide ? `/scholarships/${data.guide.id}` : "/scholarships"}
      >
        <ArrowLeft size={16} />
        Back to guide
      </Link>
      {data.guide?.demo && <DemoNotice />}
      <div className="page-heading">
        <h1>{requirement.title}</h1>
        <p>{requirement.description}</p>
      </div>
      <div className="detail-layout">
        <div>
          <section className="surface">
            <h2>How to prepare</h2>
            {requirement.steps.length ? (
              <ol className="acquisition-steps">
                {requirement.steps.map((s, i) => (
                  <li key={`${i}-${s}`}>
                    <span>{i + 1}</span>
                    <p>{s}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                Acquisition steps have not been published for this item. Please
                consult the official scholarship office.
              </p>
            )}
          </section>
          {cycle && <DocumentCheckPanel cycleId={cycle.id} requirement={requirement} />}
          {(requirement.issuingOffice || requirement.officeAddress || requirement.officeHours || requirement.mapUrl) && (
             <section className="surface" aria-label="Where to get this document">
               <h2><MapPin size={20} aria-hidden="true" /> Where to get this document</h2>
               {requirement.issuingOffice && <p><strong>Issuing office:</strong> {requirement.issuingOffice}</p>}
               {requirement.officeAddress && <p><strong>Address:</strong> {requirement.officeAddress}</p>}
               {requirement.officeHours && <p><strong>Office hours:</strong> {requirement.officeHours}</p>}
               {requirement.mapUrl && <a className="btn secondary compact" href={requirement.mapUrl} target="_blank" rel="noopener noreferrer">
                 <MapPin size={16} aria-hidden="true"/> Open pinned location <ExternalLink size={14} aria-hidden="true"/>
               </a>}
               <p className="helper">Confirm the address and opening hours with the issuing office before visiting.</p>
             </section>
           )}
           <section className="surface">
             <h2>Questions you might have</h2>
            {requirement.faqs.length ? (
              requirement.faqs.map((f, i) => (
                <details key={i}>
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))
            ) : (
              <p>No FAQs have been published for this item.</p>
            )}
          </section>
          <Sources sources={cycle?.sources ?? []} />
        </div>
        <aside className="context-panel">
          <ClipboardCheck size={28} />
          <h2>Where are you with this item?</h2>
          {cycle && prep.ready ? (
            <>
              <StatusSelect
                id={id}
                title={requirement.title}
                value={prep.entries[id]?.status ?? "not-started"}
                onChange={(s) => prep.update(id, s)}
              />
              <p className="helper" role="status">
                Your status saves automatically in this browser. “Prepared” is
                your own assessment.
              </p>
              {prep.changed.some((r) => r.id === id) && (
                <Notice tone="warning">
                  The guide changed since your last review. Read the updated
                  instructions.
                </Notice>
              )}
              {prep.warning && <Notice tone="warning">{prep.warning}</Notice>}
              <Link
                href="/my-checklist"
                className="text-link"
                onClick={() => {
                  if (data.guide)
                    w.select({
                      level:
                        w.preferences?.level ??
                        data.guide.level ??
                        "Not specified",
                      applicantType:
                        w.preferences?.applicantType ?? "New applicant",
                      programId: data.guide.id,
                      cycleId: cycle.id,
                    });
                }}
              >
                Go to my checklist
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <p>
              Select a published guide and cycle to save a preparation status
              for this item.
            </p>
          )}
          {cycle && data.guide && <Link
            className="btn primary"
            href={`/document-review?requirement=${encodeURIComponent(id)}`}
            onClick={selectContext}
          >
            Check my document
            <ScanText size={17} />
          </Link>}
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              if (data.guide && cycle)
                w.select({
                  level:
                    w.preferences?.level ?? data.guide.level ?? "Not specified",
                  applicantType:
                    w.preferences?.applicantType ?? "New applicant",
                  programId: data.guide.id,
                  cycleId: cycle.id,
                });
              openChat(id);
            }}
          >
            Ask Gabay about this item
            <MessageCircle size={17} />
          </button>
        </aside>
      </div>
    </>
  );
}
export function Summary() {
  const { guide, cycle, visit } = useWorkspace();
  const prep = usePreparation(cycle);
  if (!guide || !cycle)
    return (
      <>
        <JourneyRail current="official" />
        <div className="page-heading">
          <h1>Your preparation summary</h1>
        </div>
        <WorkspaceGate />
      </>
    );
  if (!prep.ready)
    return <Loading label="Restoring your preparation progress…" />;
  const progress = progressOf(cycle.requirements, prep.entries);
  const groups: [string, Status[]][] = [
    ["Prepared by you", ["prepared"]],
    ["Still to prepare", ["not-started", "in-progress"]],
    ["Needs another look", ["needs-review"]],
  ];
  return (
    <>
      <JourneyRail current="official" />
      <Link className="back-link" href="/my-checklist">
        <ArrowLeft size={16} />
        Back to checklist
      </Link>
      <div className="page-heading">
        <h1>A moment to check your preparation.</h1>
        <p>
          {guide.title} · {cycle.year}
        </p>
      </div>
      {guide.demo && <DemoNotice />}
      <section className="surface">
        <ProgressBar {...progress} />
      </section>
      {prep.warning && <Notice tone="warning">{prep.warning}</Notice>}
      {groups.map(([title, statuses]) => {
        const items = cycle.requirements.filter((r) =>
          statuses.includes(prep.entries[r.id]?.status ?? "not-started"),
        );
        return (
          <section className="summary-section" key={title}>
            <h2>
              {title}
              <span>{items.length}</span>
            </h2>
            {items.length ? (
              <ul>
                {items.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/requirements/${r.id}?program=${guide.id}&cycle=${cycle.id}`}
                    >
                      {r.title}
                      <StatusBadge
                        status={prep.entries[r.id]?.status ?? "not-started"}
                      />
                      <ArrowRight size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No items in this section.</p>
            )}
          </section>
        );
      })}
      <p>Documents you checked this visit: {visit.documentsChecked}</p>
      {cycleWindow(cycle.start, cycle.end) === "closed" && <Notice>{closedCycleNotice(cycle.end!)}</Notice>}
      <section className="official-handoff">
        <div>
          <h2>Your official next step</h2>
          <p>
            Confirm the current requirements, application dates, and submission
            instructions on the official portal. GabayIskolar does not submit
            your application or determine eligibility.
          </p>
        </div>
        <div className="handoff-actions">
          <a className="btn primary" href={cycle.officialUrl} target="_blank" rel="noopener noreferrer">
            Continue to the official application page
          </a>
          {cycle.officialUrl !== OFFICIAL_PORTAL && <OfficialLink className="text-link">Pasig City Scholarship Portal</OfficialLink>}
        </div>
      </section>
    </>
  );
}
