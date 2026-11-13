"use client";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { OCR_DISCLAIMER } from "@/lib/ocr/extract-fields";
import { analyzeDocument, type Analysis } from "@/lib/verification/analyze";
import type { DocumentRecord, ProfileId } from "@/lib/verification/contract";
import { getProfile } from "@/lib/verification/profiles";
import { recordStore } from "@/lib/verification/store";
import { startAiReview, useAiReviewPending } from "./ai-runner";
import { FlagList } from "./flag-list";
import { useDocumentRecords } from "./use-records";
import "./verification.css";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (!(minutes >= 1)) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${plural(hours, "hour")} ago` : new Date(iso).toLocaleDateString();
}

function Section({ title, meta, defaultOpen = false, children }: { title: string; meta?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="vf-section">
      <CollapsibleTrigger className="vf-trigger">
        <span className="vf-trigger-title">{title}</span>
        {meta ? <span className="vf-meta">{meta}</span> : null}
        <ChevronDown className="vf-chevron" size={18} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="vf-panel">
        <div className="vf-panel-inner">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Chips({ counts }: { counts: Analysis["counts"] }) {
  const chips = [
    counts.alert ? { severity: "alert", text: `${plural(counts.alert, "possible mismatch", "possible mismatches")}` } : null,
    counts.warning ? { severity: "warning", text: `${counts.warning} to check` } : null,
    counts.info ? { severity: "info", text: plural(counts.info, "note") } : null,
  ].filter((chip) => chip !== null);
  return (
    <p className="vf-chips">
      {chips.length ? chips.map((chip) => <span key={chip.severity} className={`vf-chip vf-${chip.severity}`}>{chip.text}</span>)
        : <span className="vf-chip vf-ok"><Check size={14} aria-hidden="true" /> No flags</span>}
    </p>
  );
}

function ExtractedDetails({ cycleId, record }: { cycleId: string; record: DocumentRecord }) {
  const title = getProfile(record.profileId).title;
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(record.fields.map((f) => [f.key, f.value])));
  const changed = record.fields.some((f) => draft[f.key] !== f.value);
  function save() {
    const fields = record.fields.map((f) => (draft[f.key] !== f.value ? { ...f, value: draft[f.key].trim(), needsReview: false, warnings: [] } : f));
    recordStore.save(cycleId, { ...record, fields, correctedAt: new Date().toISOString() });
    toast.add({ title: "Corrections saved", description: `Checks updated for ${title}`, type: "success" });
  }
  return (
    <form className="vf-form" onSubmit={(e) => { e.preventDefault(); if (changed) save(); }}>
      {record.fields.map((f) => (
        <div className="vf-field" key={f.key}>
          <label htmlFor={`vf-field-${f.key}`}>{f.label}</label>
          <input
            id={`vf-field-${f.key}`}
            value={draft[f.key] ?? ""}
            maxLength={1000}
            aria-describedby={`vf-note-${f.key}`}
            onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
          />
          <span className="vf-note" id={`vf-note-${f.key}`}>
            {f.originalText && <small>Read from document: {f.originalText.replace(/\s+/g, " ")}</small>}
            {f.warnings.map((w) => <small key={w} className="vf-warn">{w}</small>)}
          </span>
        </div>
      ))}
      <Button type="submit" disabled={!changed}>Save corrections</Button>
    </form>
  );
}

function AiSection({ cycleId, record }: { cycleId: string; record: DocumentRecord }) {
  const pending = useAiReviewPending(cycleId, record.profileId);
  const { ai } = record;
  const stale = ai?.status === "ok" && !!record.correctedAt && record.correctedAt > ai.reviewedAt;
  const meta = pending ? "reading…" : !ai ? "not run" : ai.status === "ok" ? plural(ai.flags.length, "suggestion") : "unavailable";
  return (
    <Section title="Lumen AI review" meta={meta}>
      {pending ? (
        <p role="status">Lumen AI is reading the details…</p>
      ) : ai?.status === "ok" ? (
        <p>{ai.flags.length ? `Lumen AI found ${plural(ai.flags.length, "thing")} to check. They're listed under Flags to review.` : "Lumen AI found nothing else to check."}</p>
      ) : ai ? (
        <>
          <p>{ai.message}</p>
          <Button variant="outline" onClick={() => void startAiReview(cycleId, record.profileId)}>Try Lumen AI again</Button>
        </>
      ) : (
        <>
          <p>Lumen AI reads the extracted details for anything that looks inconsistent. Use fictional or sample documents only.</p>
          <Button variant="outline" onClick={() => void startAiReview(cycleId, record.profileId)}>Ask Lumen AI to review</Button>
        </>
      )}
      {stale && <p className="vf-note">Based on the original read, before your corrections.</p>}
    </Section>
  );
}

const MATCH_WORD = { match: "Matches", partial: "Needs a closer look", mismatch: "Differs" } as const;

export function VerificationDialog({ cycleId, profileId, open, onOpenChange }: {
  cycleId: string; profileId: ProfileId; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const records = useDocumentRecords(cycleId);
  const record = records[profileId];
  const analysis = record ? analyzeDocument(profileId, records, new Date()) : null;
  if (!record || !analysis) return null;
  const profile = getProfile(profileId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gabay-verify">
        <header className="vf-head">
          <DialogTitle className="vf-title">{profile.title}</DialogTitle>
          <DialogDescription className="vf-sub">
            Read from {record.source === "sample" ? "a fictional sample" : "your uploaded document"}, {relativeTime(record.analyzedAt)}
          </DialogDescription>
          <Chips counts={analysis.counts} />
        </header>
        <div className="vf-body">
          <Section title="Flags to review" meta={String(analysis.flags.length)} defaultOpen>
            <FlagList flags={analysis.flags} fields={record.fields} />
          </Section>
          <Section title="Extracted details" meta={String(record.fields.length)}>
            <ExtractedDetails key={`${record.analyzedAt}-${record.correctedAt ?? ""}`} cycleId={cycleId} record={record} />
          </Section>
          <Section title="Matches with your other documents" meta={String(analysis.comparisons.length)}>
            {analysis.comparisons.length ? (
              <ul className="vf-matches">
                {analysis.comparisons.map((c) => (
                  <li key={c.id} className={`vf-match vf-m-${c.status}`}>
                    <strong>{c.label}</strong>
                    <span>{MATCH_WORD[c.status]}</span>
                    <small>{getProfile(c.left.profile).title}: {c.left.value}</small>
                    <small>{getProfile(c.right.profile).title}: {c.right.value}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="vf-empty">Check your other documents to compare details.</p>
            )}
          </Section>
          <AiSection cycleId={cycleId} record={record} />
          <Section title="Read text">
            <pre className="vf-raw">{record.rawText || "No text was read."}</pre>
          </Section>
        </div>
        <footer className="vf-foot">
          <p>{OCR_DISCLAIMER}</p>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
