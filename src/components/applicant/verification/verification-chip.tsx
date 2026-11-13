"use client";
import { useState } from "react";
import Link from "next/link";
import type { Requirement } from "@/lib/applicant/model";
import { analyzeDocument } from "@/lib/verification/analyze";
import { profileForRequirement } from "@/lib/verification/profiles";
import { useDocumentRecords } from "./use-records";
import { VerificationDialog } from "./verification-dialog";
import "./verification.css";

/** One line on a checklist row: what the last document check found, with a way to open it or start one. */
export function VerificationChip({ cycleId, programId, requirement }: { cycleId: string; programId: string; requirement: Requirement }) {
  const profileId = profileForRequirement(requirement);
  const records = useDocumentRecords(cycleId);
  const [open, setOpen] = useState(false);
  if (!profileId) return null;
  const record = records[profileId];
  const analysis = record ? analyzeDocument(profileId, records, new Date()) : null;

  let tone = "none";
  let text = "Not checked";
  if (analysis) {
    const toReview = analysis.counts.warning + analysis.counts.info;
    if (analysis.counts.alert) [tone, text] = ["alert", "Possible mismatch"];
    else if (toReview) [tone, text] = ["warning", `${toReview} to review`];
    else [tone, text] = ["ok", "No flags"];
  }
  return (
    <p className="vf-chiprow">
      <span className={`vf-chip vf-${tone}`}>{text}</span>
      {record ? (
        <button type="button" className="text-link" aria-label={`View check for ${requirement.title}`} onClick={() => setOpen(true)}>
          View check
        </button>
      ) : (
        <Link
          className="text-link"
          aria-label={`Check document for ${requirement.title}`}
          href={`/requirements/${requirement.id}?program=${programId}&cycle=${cycleId}#document-check`}
        >
          Check document
        </Link>
      )}
      {record && <VerificationDialog cycleId={cycleId} profileId={profileId} open={open} onOpenChange={setOpen} />}
    </p>
  );
}
