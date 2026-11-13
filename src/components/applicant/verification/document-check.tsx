"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Requirement } from "@/lib/applicant/model";
import { analyzeDocument, recordFromSample } from "@/lib/verification/analyze";
import type { SampleVariant } from "@/lib/verification/samples";
import { getProfile, profileForRequirement } from "@/lib/verification/profiles";
import { recordStore } from "@/lib/verification/store";
import { startAiReview } from "./ai-runner";
import { notifyAnalysis } from "./notify";
import { useDocumentRecords } from "./use-records";
import { VerificationDialog } from "./verification-dialog";
import "./verification.css";

/** "Check this document" on a requirement page: fictional samples now, a real upload in the next step. */
export function DocumentCheckPanel({ cycleId, requirement }: { cycleId: string; requirement: Requirement }) {
  const profileId = profileForRequirement(requirement);
  const records = useDocumentRecords(cycleId);
  const [open, setOpen] = useState(false);
  if (!profileId) return null;
  const profile = getProfile(profileId);
  const record = records[profileId];
  const analysis = record ? analyzeDocument(profileId, records, new Date()) : null;

  function runSample(variant: SampleVariant) {
    if (!profileId) return;
    const now = new Date();
    recordStore.save(cycleId, recordFromSample(profileId, variant, now));
    const next = analyzeDocument(profileId, recordStore.read(cycleId), now);
    if (next) notifyAnalysis(profile.title, next);
    setOpen(true);
    void startAiReview(cycleId, profileId);
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
      <div className="vf-actions">
        <Button variant="outline" onClick={() => runSample("clean")}>Try a clean sample</Button>
        <Button variant="outline" onClick={() => runSample("with-issues")}>Try a sample with issues</Button>
      </div>
      <p className="helper">Fictional data. Nothing is uploaded.</p>
      {record && <VerificationDialog cycleId={cycleId} profileId={profileId} open={open} onOpenChange={setOpen} />}
    </section>
  );
}
