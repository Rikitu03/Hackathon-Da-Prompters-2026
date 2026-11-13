"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Search,
} from "lucide-react";
import { fetchGuide, fetchGuides } from "@/lib/applicant/api";
import { demoGuide } from "@/lib/applicant/fixtures";
import type { Guide } from "@/lib/applicant/model";
import { closedCycleNotice, cycleWindow, formatCycleDate } from "@/lib/cycle-window";
import { JourneyRail } from "./journey";
import {
  DemoNotice,
  Loading,
  Notice,
  OfficialLink,
  useWorkspace,
} from "./workspace";

export function useGuide(id: string) {
  const [guide, setGuide] = useState<Guide | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    setError("");
    setGuide(null);
    if (!id) {
      setLoading(false);
      return;
    }
    if (id === demoGuide.id) {
      setGuide(demoGuide);
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    fetchGuide(id, c.signal)
      .then(setGuide)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(
            e instanceof Error ? e.message : "This guide could not be loaded.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [id, revision]);
  return { guide, error, loading, retry: () => setRevision((v) => v + 1) };
}
function GuideCard({ guide }: { guide: Guide }) {
  return (
    <article className="guide-card">
      <div className="guide-card-icon">
        <BookOpen size={26} />
      </div>
      <div className="guide-card-body">
        <span
          className={guide.demo ? "illustrative-label" : "publication-label"}
        >
          {guide.demo ? "Illustrative walkthrough" : "Published guide"}
        </span>
        <h2>{guide.title}</h2>
        <p>{guide.description}</p>
        <div className="guide-meta">
          <span>{guide.level ?? "Education level not specified"}</span>
          <span>{guide.cycles[0]?.year}</span>
        </div>
        <Link href={`/scholarships/${guide.id}`} className="text-link">
          Open guide
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function Explorer() {
  const [guides, setGuides] = useState<Guide[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [level, setLevel] = useState(""),
    [classification, setClassification] = useState(""),
    [sample, setSample] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetchGuides(c.signal)
      .then(setGuides)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load guides.");
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [revision]);
  const available = sample ? [...guides, demoGuide] : guides;
  const levels = [
    ...new Set(available.flatMap((g) => (g.level ? [g.level] : []))),
  ];
  const types = [
    ...new Set(
      available.flatMap((g) =>
        g.cycles.flatMap((c) => (c.applicantType ? [c.applicantType] : [])),
      ),
    ),
  ];
  const filtered = available.filter(
    (g) =>
      (!query ||
        `${g.title} ${g.description}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!level || g.level === level) &&
      (!classification ||
        g.cycles.some((c) => c.applicantType === classification)),
  );
  return (
    <>
      <JourneyRail current="guide" />
      <div className="page-heading">
        <h1>Explore scholarship guides</h1>
        <p>A clearer starting point for your scholarship preparation.</p>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search scholarship guides</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholarship guides…"
            type="search"
          />
        </label>
        <label>
          Education level
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={!levels.length}
          >
            <option value="">All levels</option>
            {levels.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Applicant classification
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            disabled={!types.length}
          >
            <option value="">All applicants</option>
            {types.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="helper">
        Filters use published metadata only. If a level or classification is not
        provided, it cannot be filtered here.
      </p>
      {error && (
        <Notice tone="error">
          <p>{error}</p>
          <button
            className="text-link"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry published guides
          </button>
        </Notice>
      )}
      <div className="demo-switch">
        <div>
          <strong>Want to see how preparation works?</strong>
          <p>Use a clearly labeled sample to explore the preparation tools.</p>
        </div>
        <button
          className="btn secondary compact"
          onClick={() => setSample(!sample)}
          aria-pressed={sample}
        >
          {sample ? "Hide illustrative guide" : "Try illustrative guide"}
        </button>
      </div>
      {loading ? (
        <Loading label="Loading scholarship guides" />
      ) : (
        <>
          <p className="result-count" role="status">
            {filtered.length} {filtered.length === 1 ? "guide" : "guides"} shown
          </p>
          {filtered.length ? (
            <div className="guide-list">
              {filtered.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          ) : (
            <section className="empty-state compact-empty">
              <BookOpen size={32} />
              <h2>
                {query || level || classification
                  ? "No matching guides"
                  : "No published guides available"}
              </h2>
              <p>
                {query || level || classification
                  ? "Try a broader search or clear your filters."
                  : "Check the official portal for current information, or explore the clearly labeled walkthrough."}
              </p>
              {(query || level || classification) && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setQuery("");
                    setLevel("");
                    setClassification("");
                  }}
                >
                  Clear filters
                </button>
              )}
              <OfficialLink className="text-link" />
            </section>
          )}
        </>
      )}
    </>
  );
}
export function GuideDetail({ id }: { id: string }) {
  const { guide, error, loading, retry } = useGuide(id);
  const [selected, setSelected] = useState("");
  const { select, preferences } = useWorkspace();
  const router = useRouter();
  if (loading) return <Loading />;
  if (error || !guide)
    return (
      <>
        <Link href="/scholarships" className="back-link">
          <ArrowLeft size={16} />
          Scholarship guides
        </Link>
        <Notice tone="error">
          <h1>Guide unavailable</h1>
          <p>{error || "This guide was not found."}</p>
          <button onClick={retry} className="btn secondary compact">
            Try again
          </button>
        </Notice>
      </>
    );
  const cycle = guide.cycles.find((c) => c.id === selected) ?? guide.cycles[0];
  if (!cycle)
    return (
      <Notice>
        No published cycle is currently available.{" "}
        <OfficialLink className="text-link" />
      </Notice>
    );
  function start() {
    select({
      level: preferences?.level ?? guide!.level ?? "Not specified",
      applicantType: preferences?.applicantType ?? "New applicant",
      programId: guide!.id,
      cycleId: cycle.id,
    });
    router.push("/my-checklist");
  }
  const window = cycleWindow(cycle.start, cycle.end);
  const windowLabel = window === "open" ? "Open" : window === "closed" ? "Closed" : window === "upcoming" ? `Opens ${formatCycleDate(cycle.start!)}` : "Dates not published";
  return (
    <>
      <JourneyRail current="guide" />
      <Link href="/scholarships" className="back-link">
        <ArrowLeft size={16} />
        All scholarship guides
      </Link>
      {guide.demo && <DemoNotice />}
      <div className="page-heading">
        <h1>{guide.title}</h1>
        <p>{guide.description}</p>
      </div>
      <div className="detail-layout">
        <div>
          <section className="surface">
            <h2>Choose your application cycle</h2>
            <span className="cycle-window">{windowLabel}</span>
            {window === "closed" && <Notice>{closedCycleNotice(cycle.end!)}</Notice>}
            <label className="field">
              Published cycle
              <select
                value={cycle.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {guide.cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.year}
                  </option>
                ))}
              </select>
            </label>
            <dl className="facts">
              <div>
                <dt>Education level</dt>
                <dd>{guide.level ?? "Not specified in published metadata"}</dd>
              </div>
              <div>
                <dt>Applicant classification</dt>
                <dd>
                  {cycle.applicantType ?? "Not specified in published metadata"}
                </dd>
              </div>
              <div>
                <dt>Application period</dt>
                <dd>
                  {cycle.start || cycle.end
                    ? `${cycle.start ? formatCycleDate(cycle.start) : "Start not published"} – ${cycle.end ? formatCycleDate(cycle.end) : "End not published"}`
                    : "No current dates verified here"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="surface">
            <h2>What to prepare</h2>
            <p>
              Open each guide for acquisition steps, questions, and sources.
            </p>
            {cycle.requirements.length ? (
              <ol className="requirement-links">
                {cycle.requirements.map((r, i) => (
                  <li key={r.id}>
                    <Link
                      href={`/requirements/${r.id}?program=${guide.id}&cycle=${cycle.id}`}
                    >
                      <span className="row-number">{i + 1}</span>
                      <div>
                        <strong>{r.title}</strong>
                        <small>
                          {r.required
                            ? "Listed as required"
                            : "Optional in this guide"}
                        </small>
                      </div>
                      <ArrowRight size={18} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <Notice>
                No requirements have been published for this cycle yet.
              </Notice>
            )}
          </section>
          <Sources sources={cycle.sources} />
        </div>
        <aside className="context-panel">
          <BookOpen size={30} />
          <h2>A clearer path starts here.</h2>
          <p>
            Use this cycle to make your preparation checklist. Your progress
            stays in this browser.
          </p>
          <button className="btn primary" onClick={start}>
            Use this guide
            <ArrowRight size={17} />
          </button>
          <a
            href={cycle.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Official portal
            <ArrowUpRight size={16} />
          </a>
          <p className="helper">
            A preparation guide does not establish eligibility or guarantee
            approval.
          </p>
        </aside>
      </div>
    </>
  );
}
export function Sources({
  sources,
}: {
  sources: Guide["cycles"][number]["sources"];
}) {
  return (
    <section className="source-section">
      <h2>Source references</h2>
      {sources.length ? (
        <ul>
          {sources.map((s) => (
            <li key={s.id}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                  <ArrowUpRight size={14} />
                </a>
              ) : (
                <span>{s.title} · Link not supplied</span>
              )}
              <small>
                {s.reviewedAt
                  ? `Reviewed ${new Date(s.reviewedAt).toLocaleDateString("en-PH")}`
                  : "Review date not published"}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No verified source references have been supplied for this cycle.
          Confirm details at the official portal.
        </p>
      )}
      <OfficialLink className="text-link" />
    </section>
  );
}
export function Onboarding() {
  const [guides, setGuides] = useState<Guide[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [sample, setSample] = useState(false),
    [level, setLevel] = useState(""),
    [type, setType] = useState("New applicant"),
    [id, setId] = useState(""),
    [cycleId, setCycleId] = useState("");
  const { select } = useWorkspace();
  const router = useRouter();
  useEffect(() => {
    const c = new AbortController();
    fetchGuides(c.signal)
      .then(setGuides)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Guides unavailable.");
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, []);
  const available = sample ? [...guides, demoGuide] : guides;
  const guide = available.find((g) => g.id === id);
  const cycle = guide?.cycles.find((c) => c.id === cycleId) ?? guide?.cycles[0];
  return (
    <div className="onboarding-wrap">
      <JourneyRail current="guide" />
      <div className="page-heading">
        <h1>Let’s find your starting point.</h1>
        <p>
          Just a few preparation preferences. No student account or personal
          details needed.
        </p>
      </div>
      <form
        className="surface onboarding-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (guide && cycle) {
            select({
              level,
              applicantType: type,
              programId: guide.id,
              cycleId: cycle.id,
            });
            router.push("/dashboard");
          }
        }}
      >
        <div className="form-pair">
          <label className="field">
            Education level
            <select required value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Choose your level</option>
              <option>Elementary (Grades 4–6)</option>
              <option>Junior high school (Grades 7–10)</option>
              <option>Senior high school (Grades 11–12)</option>
              <option>College / university</option>
            </select>
          </label>
          <label className="field">
            I’m preparing as a
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>New applicant</option>
              <option>Renewing scholar</option>
            </select>
          </label>
        </div>
        <p className="helper">
          These preferences organize your workspace. They do not confirm that a
          guide applies to you.
        </p>
        {loading ? (
          <Loading />
        ) : (
          <>
            {error && (
              <Notice tone="warning">
                {error} You can still explore an illustrative walkthrough.
              </Notice>
            )}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={sample}
                onChange={(e) => {
                  setSample(e.target.checked);
                  if (!e.target.checked && id === demoGuide.id) setId("");
                }}
              />
              <span>
                Include the illustrative preparation walkthrough
                <small>
                  Sample content, not an official scholarship offering.
                </small>
              </span>
            </label>
            <label className="field">
              Intended scholarship guide
              <select
                required
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setCycleId("");
                }}
              >
                <option value="">Choose a guide</option>
                {available.map((g) => (
                  <option value={g.id} key={g.id}>
                    {g.demo ? "Illustrative · " : ""}
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
            {guide && (
              <label className="field">
                Application cycle
                <select
                  value={cycle?.id}
                  onChange={(e) => setCycleId(e.target.value)}
                >
                  {guide.cycles.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.year}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {guide?.demo && <DemoNotice />}
            {!available.length && (
              <p>
                No published guides are available right now. Check the official
                portal, or include the illustrative walkthrough.
              </p>
            )}
          </>
        )}
        <button
          disabled={!guide || !cycle || !level}
          className="btn primary"
          type="submit"
        >
          Create my workspace
          <ArrowRight size={17} />
        </button>
        <p className="helper">
          Preferences and checklist statuses are saved on this browser only.
          Documents are never saved in your checklist.
        </p>
      </form>
    </div>
  );
}
