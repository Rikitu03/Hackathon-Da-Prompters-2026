import { toast } from "@/components/ui/toast";
import type { Analysis } from "@/lib/verification/analyze";

/** Toast after a document has been read and checked. Wording matches the dialog: flags are things to review, not verdicts. */
export function notifyAnalysis(title: string, analysis: Analysis): void {
  const n = analysis.flags.length;
  toast.add({
    title: `${title} checked`,
    description: n ? `${n} flag${n === 1 ? "" : "s"} to review` : "No flags. Compare each detail with your original.",
    type: n ? "warning" : "success",
  });
}
