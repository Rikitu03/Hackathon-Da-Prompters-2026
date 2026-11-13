"use client";
import { useSyncExternalStore } from "react";
import type { RecordMap } from "@/lib/verification/contract";
import { recordStore } from "@/lib/verification/store";

const EMPTY: RecordMap = Object.freeze({});

/** The documents checked in this tab for one cycle. Re-renders whenever one is saved, corrected or cleared. */
export function useDocumentRecords(cycleId?: string): RecordMap {
  return useSyncExternalStore(
    recordStore.subscribe,
    () => (cycleId ? recordStore.read(cycleId) : EMPTY),
    () => EMPTY,
  );
}
