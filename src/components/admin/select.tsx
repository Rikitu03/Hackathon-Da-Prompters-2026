"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

type Option = { value: string; label: string; disabled?: boolean };

/**
 * Keyboard/typeahead accessible selector with intentional spacing and a subtle focus state.
 * Uses a Radix portal to prevent clipping inside cards and side panels.
 */
export function AdminSelect({
  id, value, onChange, options, placeholder, disabled = false, ariaLabel
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
    <SelectPrimitive.Trigger
      id={id}
      aria-label={ariaLabel}
      className="admin-select-trigger mt-1.5 flex min-h-12 w-full min-w-0 items-center justify-between gap-4 rounded-xl border border-[#d7e3ef] bg-white py-3 pl-4 pr-4 text-left text-[15px] font-medium text-[#102a51] shadow-[0_1px_1px_rgba(18,66,42,0.035)] transition-[border-color,box-shadow,background-color] duration-150 hover:border-[#9cbde0] data-[placeholder]:text-[#53657b] focus-visible:border-[#155bb0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="min-w-0 flex-1 truncate"><SelectPrimitive.Value placeholder={placeholder}/></span>
      <SelectPrimitive.Icon aria-hidden="true" className="ml-1 inline-flex shrink-0 items-center justify-center text-[#53657b]">
        <ChevronDown size={18} strokeWidth={1.9}/>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={7}
        collisionPadding={12}
        className="admin-select-content z-[70] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#d7e3ef] bg-white p-1.5 shadow-[0_18px_60px_rgba(22,61,42,0.16)]"
      >
        <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-[#53657b]"><ChevronUp size={16}/></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="max-h-[300px] overflow-y-auto">
          {options.length ? options.filter(option=>option.value !== "").map(option =>
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              textValue={option.label}
              className="relative flex min-h-11 cursor-default select-none items-center rounded-lg py-2.5 pl-3.5 pr-10 text-[15px] leading-6 text-[#102a51] outline-none transition-colors duration-100 data-[highlighted]:bg-[#eef6ff] data-[highlighted]:text-[#102a51] data-[state=checked]:font-semibold data-[disabled]:opacity-50"
            >
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center justify-center text-[#155bb0]"><Check size={17}/></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ) : <div className="px-4 py-3 text-sm text-[#53657b]">No options available</div>}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-[#53657b]"><ChevronDown size={16}/></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
