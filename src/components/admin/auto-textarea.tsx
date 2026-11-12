"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Long entries may scroll beyond this height; short entries never show a scrollbar. */
  maxHeight?: number;
};

export function AutoTextarea({ value, defaultValue, maxHeight = 320, rows = 2, className = "", onInput, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = (field: HTMLTextAreaElement) => {
    field.style.height = "auto";
    const scrollHeight = field.scrollHeight;
    field.style.height = Math.min(scrollHeight, maxHeight) + "px";
    field.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    if (ref.current) resize(ref.current);
  }, [value, defaultValue, maxHeight]);

  return <textarea
    {...props}
    ref={ref}
    rows={rows}
    value={value}
    defaultValue={defaultValue}
    onInput={e => {
      resize(e.currentTarget);
      onInput?.(e);
    }}
    className={"min-w-0 resize-none " + className}
  />;
}
