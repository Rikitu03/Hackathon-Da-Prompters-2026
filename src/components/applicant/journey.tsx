"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { JOURNEY_STAGES, journeyProgress, nextStage, progressOf, type StageId } from "@/lib/applicant/model";
import { usePreparation, useWorkspace } from "./workspace";

export function JourneyRail({ current }: { current: StageId | null }) {
  const { cycle, visit } = useWorkspace();
  const prep = usePreparation(cycle);
  const counts = progressOf(cycle?.requirements ?? [], prep.entries);
  const progress = journeyProgress({ hasCycle: !!cycle, ...counts, ...visit });
  const active = current ?? nextStage(progress);
  const index = JOURNEY_STAGES.findIndex((stage) => stage.id === active);
  return (
    <nav className="journey-rail" aria-label="Your preparation journey">
      <p className="journey-mobile-title">Step {index + 1} of 5 · {JOURNEY_STAGES[index].label}</p>
      <svg className="journey-river" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 12 Q12.5 0 25 12 T50 12 T75 12 T100 12" />
        <path className="journey-river-progress" style={{ clipPath: `inset(0 ${100 - JOURNEY_STAGES.findIndex((stage) => stage.id === nextStage(progress)) * 25}% 0 0)` }} d="M0 12 Q12.5 0 25 12 T50 12 T75 12 T100 12" />
      </svg>
      <ol>
        {JOURNEY_STAGES.map((stage) => (
          <li key={stage.id} className={progress[stage.id] === "done" ? "is-done" : ""}>
            <Link href={stage.href} aria-label={`${stage.label}${progress[stage.id] === "done" ? ", done" : ""}`} aria-current={stage.id === active ? "step" : undefined}>
              <span className="journey-stop" aria-hidden="true">{progress[stage.id] === "done" && <Check size={16} />}</span>
              <span className="journey-stage-label">{stage.label}{progress[stage.id] === "done" && <span className="sr-only">, done</span>}</span>
              {stage.id === "checklist" && cycle && <small>{counts.prepared} of {counts.total} ready</small>}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
