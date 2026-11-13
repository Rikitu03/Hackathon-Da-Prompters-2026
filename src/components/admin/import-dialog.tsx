"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ContextImport, type ContextDraft } from "./context-import";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (draft: ContextDraft) => void;
  demoMode: boolean;
};

/**
 * Native modal dialog: top-layer backdrop, keyboard focus containment,
 * Escape dismissal, focus restoration, and an independently scrollable panel.
 */
export function AdminImportDialog({ open, onClose, onApply, demoMode }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      // The native dialog restores focus, including after applying draft fields.
      trigger?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Import scholarship source"
      aria-modal="true"
      className="admin-import-dialog"
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (outside) onClose();
      }}
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Close import dialog"
          autoFocus
          onClick={onClose}
          className="admin-import-close absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9e4ef] bg-white text-[#102a51] shadow-[0_2px_8px_rgba(16,42,81,.12)] transition-colors hover:bg-[#eef4fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0]"
        >
          <X size={20} aria-hidden="true"/>
        </button>
        <ContextImport
          demoMode={demoMode}
          onApply={(draft) => {
            onApply(draft);
            onClose();
          }}
        />
      </div>
    </dialog>
  );
}
