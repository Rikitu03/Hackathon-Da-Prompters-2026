"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, CircleHelp } from "lucide-react";

/** Semantic, keyboard-operable FAQ with restrained motion and no native play-like marker. */
export function FaqAccordion({ question, answer }: { question: string; answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const key = useId();
  const triggerId = key + "-trigger";
  const panelId = key + "-panel";
  const reducedMotion = useReducedMotion();

  return <div className="mt-3 overflow-hidden rounded-xl border border-[#d7e3ef] bg-white">
    <h5>
      <button type="button" id={triggerId} aria-controls={panelId} aria-expanded={expanded}
        onClick={() => setExpanded(state => !state)}
        className="group flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left text-base font-semibold text-[#102a51] transition-colors duration-150 hover:bg-[#eef6ff] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#155bb0]"
      >
        <span className="flex min-w-0 items-center gap-3"><CircleHelp size={19} className="shrink-0 text-[#155bb0]" aria-hidden="true"/>{question}</span>
        <ChevronDown size={19} aria-hidden="true"
          className={"shrink-0 text-[#53657b] transition-transform duration-200 " + (expanded ? "rotate-180" : "")}
        />
      </button>
    </h5>
    <AnimatePresence initial={false}>
      {expanded ? <motion.div id={panelId} role="region" aria-labelledby={triggerId}
        initial={reducedMotion ? false : { height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      ><p className="border-t border-[#d7e3ef] px-4 py-3 text-base leading-7 text-[#294e70]">{answer}</p></motion.div> : null}
    </AnimatePresence>
  </div>;
}
