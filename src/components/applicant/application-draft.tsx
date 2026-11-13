"use client";
import { useEffect, useState } from "react";
import { useWorkspace, Empty, Notice } from "./workspace";
import { useBrowserSession } from "./browser-session";
import { blankDraftFields, deleteLocalDraft, draftFieldsSchema, loadLocalDraft, saveLocalDraft, type DraftFields } from "@/lib/applicant/local-draft";

export function ApplicationDraft() {
  const { cycle, guide, ready, loading } = useWorkspace();
  const { reference, error: referenceError, reset } = useBrowserSession();
  const [fields, setFields] = useState<DraftFields>({ ...blankDraftFields });
  const [loadedCycle, setLoadedCycle] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoadedCycle(""); setFields({ ...blankDraftFields }); setSavedAt(""); setDirty(false); setMessage("");
    if (!cycle) return;
    void loadLocalDraft(cycle.id).then((draft) => {
      if (!active) return;
      if (draft) { setFields(draft.fields); setSavedAt(draft.updatedAt); }
    }).catch(() => { if (active) setMessage("Could not restore a saved draft. You can still prepare the form and export a copy."); })
      .finally(() => { if (active) setLoadedCycle(cycle.id); });
    return () => { active = false; };
  }, [cycle]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function action(work: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : "The action could not be completed"); }
    finally { setBusy(false); }
  }
  if (!ready || loading) return <p role="status">Loading your selected guide...</p>;
  if (!cycle || !guide) return <Empty title="Choose a guide for your draft" detail="Your private draft belongs to the scholarship cycle you select. No applicant account is needed."/>;
  const editable = loadedCycle === cycle.id && !busy;
  function record() {
    return { version: 1 as const, programId: guide!.id, cycleId: cycle!.id, updatedAt: new Date().toISOString(), fields: draftFieldsSchema.parse(fields) };
  }
  const labels: [keyof DraftFields, string][] = [["fullName","Full name"],["email","Email"],["mobile","Mobile number"],["school","School"],["educationLevel","Education level"],["barangay","Barangay"]];
  return <>
    <div className="page-heading"><h1>Private application draft</h1><p>Prepare personal details for {guide.title}. Nothing in this form is sent to our database.</p></div>
    <Notice><strong>Saved on this device only.</strong> No signup or login is needed. Anyone using this browser profile may be able to read saved drafts. Clear them on shared devices. This form does not submit an official application.</Notice>
    <section className="surface" style={{ marginTop: 20 }}>
      <p className="muted">Browser reference: {reference ? reference.sessionId : referenceError || "Connecting..."}</p>
      <p>Only a random reference and limited security metadata are stored in Supabase. References expire after seven days; your local draft is independent of that expiry.</p>
      <button type="button" className="btn secondary compact" disabled={busy} onClick={() => action(async () => { await reset(); setMessage("Browser reference reset. Your local draft was kept."); })}>Reset browser reference</button>
    </section>
    <form className="surface" style={{ marginTop: 20 }} onSubmit={(event) => { event.preventDefault(); void action(async () => { const draft = record(); await saveLocalDraft(draft); setSavedAt(draft.updatedAt); setDirty(false); setMessage("Draft saved on this device. No personal fields were sent to the server."); }); }}>
      <h2>Your preparation details</h2><p>Every field is optional. Do not enter passwords, government ID numbers, or financial account details.</p>
      <fieldset disabled={!editable} style={{ border: 0, padding: 0, display: "grid", gap: 16, marginTop: 20 }}>
        {labels.map(([key, label]) => <label key={key} className="field">{label}<input type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"} autoComplete="off" maxLength={key === "mobile" ? 40 : key === "school" ? 250 : key === "email" ? 254 : key === "educationLevel" || key === "barangay" ? 150 : 200} value={fields[key]} onChange={(event) => { setFields((value) => ({ ...value, [key]: event.target.value })); setDirty(true); }}/></label>)}
        <label className="field">Preparation notes<textarea rows={4} maxLength={2000} value={fields.notes} onChange={(event) => { setFields((value) => ({ ...value, notes: event.target.value })); setDirty(true); }}/></label>
        <div className="handoff-actions"><button type="submit" className="btn primary">Save on this device</button><button type="button" className="btn secondary" onClick={() => action(async () => {
          const blob = new Blob([JSON.stringify(record(), null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "gabayiskolar-private-draft.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("Private draft exported. Keep the downloaded file private.");
        })}>Export private draft</button><button type="button" className="btn secondary" onClick={() => {
          if (window.confirm("Delete the saved draft for this cycle and clear its fields on this device?")) void action(async () => { await deleteLocalDraft(cycle.id); setFields({ ...blankDraftFields }); setSavedAt(""); setDirty(false); setMessage("Saved draft deleted from this device."); });
        }}>Delete local draft</button></div>
      </fieldset>
      <p className="muted">{dirty ? "Unsaved changes. Save before switching guides or leaving." : savedAt ? `Last saved: ${new Date(savedAt).toLocaleString()}` : "No draft saved on this device yet."}</p>
      {message && <p role="status">{message}</p>}
    </form>
  </>;
}
