"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { OCR_CLIENT_TIMEOUT_MS } from "@/lib/ai-limits";
import { reviewDocument } from "@/lib/applicant/api";
import { validateFile, type Requirement } from "@/lib/applicant/model";
import { analyzeDocument, recordFromOcr } from "@/lib/verification/analyze";
import { getProfile, profileForRequirement } from "@/lib/verification/profiles";
import { recordStore } from "@/lib/verification/store";
import { Notice } from "../workspace";
import { startAiReview } from "./ai-runner";
import { notifyAnalysis } from "./notify";
import { useDocumentRecords } from "./use-records";
import { VerificationDialog } from "./verification-dialog";
import "./verification.css";

const CONSENT_TEXT =
  "Send this document to Lumen OCR and Lumen AI to read and review it. Lumen keeps a copy that other teams in this hackathon can see, and it can't be deleted. Use a sample or fictional document only.";

/** "Check this document" on a requirement page: upload a copy, read it with Lumen OCR, check it with rules and Lumen AI. */
export function DocumentCheckPanel({ cycleId, requirement }: { cycleId: string; requirement: Requirement }) {
  const profileId = profileForRequirement(requirement);
  const records = useDocumentRecords(cycleId);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!profileId) return null;
  const profile = getProfile(profileId);
  const record = records[profileId];
  const analysis = record ? analyzeDocument(profileId, records, new Date()) : null;

  /** Keep the new record, tell the student, show the results, and ask Lumen AI for a second opinion. */
  function showResults(now: Date) {
    if (!profileId) return;
    const next = analyzeDocument(profileId, recordStore.read(cycleId), now);
    if (next) notifyAnalysis(profile.title, next);
    setOpen(true);
    void startAiReview(cycleId, profileId);
  }

  function choose(next: File | undefined) {
    if (!next || pending) return;
    const issue = validateFile(next);
    setError(issue ?? "");
    if (issue) return;
    setFile(next);
    setConsent(false);
  }

  function release() {
    setFile(null);
    setConsent(false);
    if (input.current) input.current.value = "";
  }

  async function checkUpload() {
    if (!file || !consent || pending || !profileId) return;
    setPending(true);
    setError("");
    const c = new AbortController();
    controller.current = c;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      c.abort();
    }, OCR_CLIENT_TIMEOUT_MS);
    try {
      const result = await reviewDocument(file, c.signal, profileId);
      const now = new Date();
      recordStore.save(cycleId, recordFromOcr(profileId, result, now));
      release(); // the details now live in this tab's record; the file itself isn't kept
      showResults(now);
    } catch (e) {
      if (c.signal.aborted && !timedOut) return; // the student cancelled
      const message = timedOut
        ? "Document review took too long. Retry or continue with the manual checklist."
        : e instanceof Error
          ? e.message
          : "Could not reach document review. Please check your connection.";
      setError(message);
      toast.add({ title: "Couldn't check this document", description: message, type: "error" });
    } finally {
      clearTimeout(timeout);
      if (controller.current === c) {
        controller.current = null;
        setPending(false);
      }
    }
  }

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setError("Checking stopped. Your file is still selected if you want to retry.");
  }

  const flags = analysis?.flags.length ?? 0;
  return (
    <section id="document-check" className="surface document-check" aria-labelledby="document-check-title">
      <h2 id="document-check-title">Check this document</h2>
      <p className="vf-lede">
        Read the key details from your {profile.title} and look for details that may be wrong or out of date. This is a
        preparation aid, not an official review.
      </p>
      {record && analysis && (
        <div className="vf-summary">
          <p>
            Checked from {record.source === "sample" ? "a fictional sample" : "your uploaded document"}.{" "}
            {flags ? `${flags} flag${flags === 1 ? "" : "s"} to review.` : "No flags found."}
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>View results</Button>
        </div>
      )}
      <div className="vf-upload">
        <p className="helper">JPG, PNG or PDF, up to 4 MB. The details Gabay reads stay in this tab only.</p>
        <div className="vf-actions">
          <Button variant="outline" disabled={pending} onClick={() => input.current?.click()}>
            {file ? "Choose another file" : "Choose document"}
          </Button>
          <input
            ref={input}
            type="file"
            className="sr-only"
            aria-label="Choose document file"
            accept="image/jpeg,image/png,application/pdf"
            disabled={pending}
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </div>
        {file && <p className="helper">{file.name}</p>}
        <label className="checkbox-field">
          <input type="checkbox" checked={consent} disabled={!file || pending} onChange={(e) => setConsent(e.target.checked)} />
          <span>{CONSENT_TEXT}</span>
        </label>
        <div className="vf-actions">
          <Button disabled={!file || !consent || pending} onClick={() => void checkUpload()}>
            {pending ? "Checking…" : "Check document"}
          </Button>
          {pending && <button type="button" className="text-link" onClick={cancel}>Cancel</button>}
        </div>
        {error && (
          <Notice tone="error">
            <p>{error}</p>
          </Notice>
        )}
      </div>
      {record && <VerificationDialog cycleId={cycleId} profileId={profileId} open={open} onOpenChange={setOpen} />}
    </section>
  );
}
