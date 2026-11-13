"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/http-client";
type BrowserReference = { sessionId: string; expiresAt: string };
let pending: Promise<BrowserReference> | null = null;
let cached: BrowserReference | null = null;
function ensureReference() {
  if (cached && Date.parse(cached.expiresAt) <= Date.now()) { cached = null; pending = null; }
  if (!pending) pending = api<BrowserReference>("/api/applicant/session", { method: "POST" }).then((value) => { cached = value; return value; }).catch((error) => { pending = null; throw error; });
  return pending;
}
type State = { reference: BrowserReference | null; error: string; reset: () => Promise<void> };
const Context = createContext<State>({ reference: null, error: "", reset: async () => {} });
export function BrowserSessionProvider({ children }: { children: React.ReactNode }) {
  const [reference, setReference] = useState<BrowserReference | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void ensureReference().then((value) => { if (active) setReference(value); }).catch(() => { if (active) setError("Browser reference unavailable. Guides and local drafts still work."); });
    return () => { active = false; };
  }, []);
  async function reset() {
    await api("/api/applicant/session", { method: "DELETE" });
    pending = null; cached = null; setReference(null);
    const value = await ensureReference(); setReference(value); setError("");
  }
  return <Context.Provider value={{ reference, error, reset }}>{children}</Context.Provider>;
}
export const useBrowserSession = () => useContext(Context);
