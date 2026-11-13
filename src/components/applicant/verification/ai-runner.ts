"use client";
import { useSyncExternalStore } from "react";
import { toast } from "@/components/ui/toast";
import { requestAiReview } from "@/lib/applicant/api";
import { PROFILE_IDS, type AiReview, type DocumentRecord, type ProfileId } from "@/lib/verification/contract";
import { getProfile } from "@/lib/verification/profiles";
import { recordStore } from "@/lib/verification/store";

const inflight = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const keyOf = (cycleId: string, profileId: ProfileId) => `${cycleId}:${profileId}`;

const aiFields = (record: DocumentRecord) =>
  record.fields.slice(0, 12).map((f) => ({ key: f.key, label: f.label.slice(0, 60), value: f.value.slice(0, 200) }));

/**
 * Ask Lumen AI for a second opinion on one checked document and keep the answer with its record.
 * One review per document at a time. A reply is saved only if the record is still the one that was
 * read, so a newer upload never inherits an older review. Never throws: failure becomes "unavailable".
 */
export async function startAiReview(cycleId: string, profileId: ProfileId): Promise<void> {
  const key = keyOf(cycleId, profileId);
  const records = recordStore.read(cycleId);
  const record = records[profileId];
  if (!record || inflight.has(key)) return;
  const analyzedAt = record.analyzedAt;
  const title = getProfile(profileId).title;
  inflight.add(key);
  emit();
  try {
    const related = PROFILE_IDS.filter((id) => id !== profileId && records[id])
      .slice(0, 2)
      .map((id) => ({ profileId: id, fields: aiFields(records[id]!) }));
    const result = await requestAiReview({
      consent: true, profileId, fields: aiFields(record), rawText: record.rawText.slice(0, 1500), related,
    });
    const latest = recordStore.read(cycleId)[profileId];
    if (!latest || latest.analyzedAt !== analyzedAt) return;
    const ai: AiReview = result.status === "ok"
      ? { status: "ok", flags: result.flags, reviewedAt: new Date().toISOString() }
      : { status: "unavailable", message: result.message };
    recordStore.save(cycleId, { ...latest, ai });
    if (result.status === "ok") {
      const n = result.flags.length;
      toast.add({
        title: "Lumen AI review finished",
        description: n ? `${n} more detail${n === 1 ? "" : "s"} to check in ${title}` : `Nothing else to check in ${title}`,
        type: "info",
      });
    } else {
      toast.add({ title: "Lumen AI review unavailable", description: result.message, type: "info" });
    }
  } finally {
    inflight.delete(key);
    emit();
  }
}

/** True while a Lumen AI review of this document is running. */
export function useAiReviewPending(cycleId: string, profileId: ProfileId): boolean {
  return useSyncExternalStore(subscribe, () => inflight.has(keyOf(cycleId, profileId)), () => false);
}
