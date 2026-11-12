"use client";

import { useRef, useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, Check, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "./ui";

type StepItem = { id: string; value: string };
type RemovedStep = { index: number; id: string; value: string };

function IconAction({ label, children, disabled = false, danger = false, onClick }: {
  label: string; children: React.ReactNode; disabled?: boolean; danger?: boolean; onClick: () => void
}) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
    className={"inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347654] disabled:cursor-not-allowed disabled:opacity-30 " +
      (danger ? "text-[#9e4c44] hover:border-[#f3d9d5] hover:bg-[#fff2ef]" : "text-[#456b56] hover:border-[#dfebe0] hover:bg-[#eaf3eb]")}
  >{children}</button>;
}

function SortableStep({ step, index, count, disabled, onText, onMove, onRemove }: {
  step: StepItem;
  index: number;
  count: number;
  disabled: boolean;
  onText: (id: string, text: string) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: step.id, disabled
  });
  return <div
    ref={setNodeRef}
    style={{ transform: CSS.Transform.toString(transform), transition: reduced ? undefined : transition }}
    className={"admin-step-card relative rounded-2xl border border-[#dae6db] bg-white p-3.5 sm:p-4 " +
      (isDragging ? "z-20 border-[#91b9a0] bg-[#f8fcf8] shadow-[0_18px_42px_rgba(22,60,40,.14)]" : "shadow-[0_3px_15px_rgba(33,64,43,.025)]")}
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-h-11 items-center gap-3">
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}
          disabled={disabled}
          title={"Drag to reorder step " + (index + 1)}
          aria-label={"Drag to reorder step " + (index + 1) + ". Use Space, arrows, then Space to drop."}
          className="inline-flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-xl border border-[#e0eae2] bg-[#f5f8f4] text-[#678474] transition-colors hover:border-[#b5d1bb] hover:bg-[#e9f3eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#307751] disabled:cursor-not-allowed disabled:opacity-40"
        ><GripVertical size={19} aria-hidden="true"/></button>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#eaf3eb] px-2 text-[13px] font-bold tabular-nums text-[#245e40]">{String(index + 1).padStart(2, "0")}</span>
        <span className="text-[15px] font-semibold text-[#234736]">Step {index + 1}</span>
      </div>
      <div className="flex items-center gap-0.5 rounded-xl border border-[#e9efe9] bg-[#fbfdfb] p-0.5" aria-label={"Actions for step " + (index + 1)}>
        <IconAction label={"Move step " + (index + 1) + " up"} disabled={disabled || index === 0} onClick={()=>onMove(index, -1)}><ArrowUp size={17}/></IconAction>
        <IconAction label={"Move step " + (index + 1) + " down"} disabled={disabled || index === count-1} onClick={()=>onMove(index, 1)}><ArrowDown size={17}/></IconAction>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-[#e2ebe2]"/>
        <IconAction label={"Remove step " + (index + 1)} disabled={disabled || count < 2} danger onClick={()=>onRemove(index)}><Trash2 size={17}/></IconAction>
      </div>
    </div>
    <label htmlFor={"admin-step-" + step.id} className="sr-only">Instruction for step {index + 1}</label>
    <textarea
      id={"admin-step-" + step.id}
      value={step.value}
      disabled={disabled}
      rows={2}
      placeholder="Write one clear, verified instruction…"
      onChange={event => onText(step.id, event.target.value)}
      className="admin-step-input mt-3 block min-h-20 w-full resize-y rounded-xl border border-[#dce6de] bg-[#fcfdfb] px-4 py-3 text-base leading-6 text-[#244735] placeholder:text-[#8a9b8e] transition-[border-color,background-color] duration-150 hover:border-[#bfd3c2] focus-visible:border-[#3b8a61] focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b8a61] disabled:cursor-not-allowed disabled:opacity-65"
    />
  </div>;
}

let nextId = 0;
const makeId = () => "step-" + (++nextId);

/**
 * Clear drag handle + arrow controls; both keyboard and touch users can reorder.
 * All edits remain in parent draft state until the explicit Save action.
 */
export function StepBuilder({ steps, onChange, disabled = false }: {
  steps: string[]; onChange: (steps: string[]) => void; disabled?: boolean;
}) {
  const ids = useRef<string[]>([]);
  const [removed, setRemoved] = useState<RemovedStep | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reduced = useReducedMotion();

  if (ids.current.length !== steps.length) {
    ids.current = steps.map((_,i)=>ids.current[i] || makeId());
  }

  const items: StepItem[] = steps.map((value,index)=>({id:ids.current[index],value}));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function reorder(index: number, next: number) {
    if (disabled || next < 0 || next >= steps.length || index === next) return;
    ids.current = arrayMove(ids.current,index,next);
    onChange(arrayMove(steps,index,next));
    setAnnouncement("Step moved to position " + (next + 1) + " of " + steps.length + ".");
    setRemoved(null);
  }
  function onDragEnd(event: DragEndEvent) {
    const {active,over} = event;
    if (!over || active.id === over.id) return;
    const from = ids.current.indexOf(String(active.id));
    const to = ids.current.indexOf(String(over.id));
    if (from >= 0 && to >= 0) reorder(from,to);
  }
  function removeAt(index: number) {
    if (disabled || steps.length < 2) return;
    setRemoved({index,id:ids.current[index],value:steps[index]});
    ids.current = ids.current.filter((_,i)=>i!==index);
    onChange(steps.filter((_,i)=>i!==index));
    setAnnouncement("Step removed. Use Undo to restore it.");
  }
  function undo() {
    if (!removed) return;
    const index = Math.min(removed.index, steps.length);
    ids.current = [...ids.current.slice(0,index),removed.id,...ids.current.slice(index)];
    onChange([...steps.slice(0,index),removed.value,...steps.slice(index)]);
    setRemoved(null);
    setAnnouncement("Removed step restored.");
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-lg font-semibold text-[#1b4331]">Acquisition steps</h3><p className="mt-1 text-sm leading-6 text-[#647d6a]">Drag using the grip handle, or use the arrows to reorder. One instruction per step.</p></div>
      <span className="rounded-full bg-[#edf3ec] px-3 py-1 text-sm font-semibold tabular-nums text-[#496c55]">{steps.length} {steps.length === 1 ? "step" : "steps"}</span>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(x=>x.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((step,index)=><SortableStep
            key={step.id} step={step} index={index} count={items.length} disabled={disabled}
            onText={(id,text)=>{const i=ids.current.indexOf(id);if(i>=0)onChange(steps.map((s,j)=>j===i?text:s));}}
            onMove={(i,delta)=>reorder(i,i+delta)}
            onRemove={removeAt}
          />)}
        </div>
      </SortableContext>
    </DndContext>
    <AnimatePresence initial={false}>
      {removed && <motion.div
        initial={reduced?false:{opacity:0,y:-6,height:0}}
        animate={{opacity:1,y:0,height:"auto"}}
        exit={reduced?{opacity:0}:{opacity:0,y:-6,height:0}}
        transition={{duration:reduced?0:0.18}}
        className="overflow-hidden"
      ><div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c9dfcb] bg-[#f0f7ef] px-4 py-2.5 text-sm text-[#315744]">
        <span className="inline-flex items-center gap-2"><Check size={16}/> Step removed from this draft.</span>
        <button type="button" onClick={undo} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-[#176448] underline underline-offset-4 hover:bg-[#e3f0e3]"><RotateCcw size={15}/> Undo</button>
      </div></motion.div>}
    </AnimatePresence>
    {!disabled ? <Button type="button" variant="outline" className="w-full border-dashed !border-[#bacfc0] !bg-[#f8fbf8] hover:!bg-[#eef7ef]"
      onClick={()=>{ids.current=[...ids.current,makeId()]; onChange([...steps,""]); setRemoved(null); setAnnouncement("Added step "+(steps.length+1)+".");}}
    ><Plus size={17}/> Add another step</Button> : null}
  </div>;
}
