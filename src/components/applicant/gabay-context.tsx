"use client";

import { createContext, useContext } from "react";

export type GabayMode = "product" | "scholarship";
export const GabayContext = createContext<{ openChat: (requirementId?: string, mode?: GabayMode) => void } | null>(null);

export function useGabay() {
  const value = useContext(GabayContext);
  if (!value) throw new Error("Ask Gabay requires the applicant experience");
  return value;
}
