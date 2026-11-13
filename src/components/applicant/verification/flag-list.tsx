import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { OCRReviewField } from "@/types/domain";
import type { Flag, Severity } from "@/lib/verification/contract";

const SEVERITY: Record<Severity, { word: string; Icon: typeof Info }> = {
  alert: { word: "Possible mismatch", Icon: CircleAlert },
  warning: { word: "Check this", Icon: TriangleAlert },
  info: { word: "Note", Icon: Info },
};
const ORIGIN: Record<Flag["origin"], string> = {
  rule: "Rule check",
  "cross-check": "Compared across documents",
  ai: "Suggested by Lumen AI",
};

/** Every flag says what to compare and where it was read from. Colour is never the only signal. */
export function FlagList({ flags, fields }: { flags: Flag[]; fields: OCRReviewField[] }) {
  if (!flags.length) return <p className="vf-empty">No flags. Compare each detail with your original.</p>;
  return (
    <ul className="vf-flags">
      {flags.map((flag) => {
        const { word, Icon } = SEVERITY[flag.severity];
        const evidence = flag.fieldKeys.map((key) => fields.find((f) => f.key === key)?.originalText).find(Boolean);
        return (
          <li key={flag.id} className={`vf-flag vf-${flag.severity}`}>
            <span className="vf-flag-mark">
              <Icon size={16} aria-hidden="true" />
              {word}
            </span>
            <strong>{flag.title}</strong>
            {flag.detail && <p>{flag.detail}</p>}
            {evidence && <small>Read: “{evidence.replace(/\s+/g, " ")}”</small>}
            <small className="vf-origin">{ORIGIN[flag.origin]}</small>
          </li>
        );
      })}
    </ul>
  );
}
