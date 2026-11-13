"use client";
import { Check, Minus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { valuesOf } from "@/lib/verification/analyze";
import { crossCheck, type Comparison, type MatchStatus } from "@/lib/verification/compare";
import { PROFILE_IDS, type FieldValues, type ProfileId } from "@/lib/verification/contract";
import { getProfile } from "@/lib/verification/profiles";
import { recordStore } from "@/lib/verification/store";
import { useDocumentRecords } from "./use-records";
import "./verification.css";

// The COR is the hub: residency and the ID are each compared with it.
const ORDER: ProfileId[] = ["certificate_of_residency", "certificate_of_registration", "school_id"];
const RANK: Record<MatchStatus, number> = { match: 0, partial: 1, mismatch: 2 };
type Tone = "none" | "match" | "partial" | "mismatch";
const ICON = { none: Minus, match: Check, partial: TriangleAlert, mismatch: X } as const;

function describeLink(a: ProfileId, b: ProfileId, comparisons: Comparison[]): { tone: Tone; text: string } {
  const pair = comparisons.filter(
    (c) => (c.left.profile === a && c.right.profile === b) || (c.left.profile === b && c.right.profile === a),
  );
  if (!pair.length) return { tone: "none", text: "Not compared yet" };
  const worst = pair.reduce<MatchStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "match");
  if (worst === "match") return { tone: "match", text: "Details match" };
  const names = pair.filter((c) => c.status === worst).map((c, i) => (i ? c.label.toLowerCase() : c.label));
  const many = names.length > 1;
  const subject = names.join(" and ");
  return worst === "mismatch"
    ? { tone: "mismatch", text: `${subject} ${many ? "differ" : "differs"}` }
    : { tone: "partial", text: `${subject} ${many ? "need" : "needs"} a closer look` };
}

/** How the three documents compare with each other, shown once at least one has been checked. */
export function DocumentTrio({ cycleId }: { cycleId: string }) {
  const records = useDocumentRecords(cycleId);
  if (!PROFILE_IDS.some((id) => records[id])) return null;
  const values: Partial<Record<ProfileId, FieldValues>> = {};
  for (const id of PROFILE_IDS) {
    const record = records[id];
    if (record) values[id] = valuesOf(record);
  }
  const comparisons = crossCheck(values);
  const links = [describeLink(ORDER[0], ORDER[1], comparisons), describeLink(ORDER[1], ORDER[2], comparisons)];

  return (
    <section className="surface vf-trio" aria-labelledby="vf-trio-title">
      <h2 id="vf-trio-title">How your documents compare</h2>
      <div className="vf-trio-row">
        {ORDER.map((id, i) => {
          const link = links[i];
          const Icon = link ? ICON[link.tone] : null;
          return (
            <div className="vf-trio-cell" key={id}>
              <div className={`vf-doc${records[id] ? " is-checked" : ""}`}>
                <strong>{getProfile(id).title}</strong>
                <span>{records[id] ? "Checked" : "Not checked"}</span>
              </div>
              {link && Icon && (
                <div className={`vf-link vf-link-${link.tone}`}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{link.text}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        className="vf-clear"
        onClick={() => {
          recordStore.clear(cycleId);
          toast.add({ title: "Checked details cleared", description: "The details read from your documents were removed from this tab.", type: "info" });
        }}
      >
        Clear checked details
      </Button>
    </section>
  );
}
