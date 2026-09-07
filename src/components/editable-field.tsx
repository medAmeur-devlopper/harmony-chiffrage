"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  defaultValue: string;
  action: (value: string) => Promise<void>;
  type?: "text" | "number";
  className?: string;
  step?: string;
}

/** A cream-colored input (Excel "user input" convention) that saves via a server action on blur. */
export function EditableField({ defaultValue, action, type = "text", className, step }: EditableFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== defaultValue) startTransition(() => action(value));
      }}
      className={cn(
        "cell-input rounded px-2 py-1 text-sm w-full",
        isPending && "opacity-60",
        className
      )}
    />
  );
}

interface EditableSelectProps {
  defaultValue: string;
  action: (value: string) => Promise<void>;
  options: { value: string; label: string }[];
  className?: string;
}

export function EditableSelect({ defaultValue, action, options, className }: EditableSelectProps) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => startTransition(() => action(e.target.value))}
      className={cn("cell-input rounded px-2 py-1 text-sm w-full", isPending && "opacity-60", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface ColorSwatchPickerProps {
  value: string;
  onChange: (value: string) => void;
  colors: string[];
  className?: string;
}

/** A row of clickable color circles — shows the picked color instead of a hex-text dropdown. */
export function ColorSwatchPicker({ value, onChange, colors, className }: ColorSwatchPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-transform",
            value === c ? "border-slate-700 scale-110" : "border-white ring-1 ring-slate-200"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface EditableColorSwatchProps {
  defaultValue: string;
  action: (value: string) => Promise<void>;
  colors: string[];
  className?: string;
}

export function EditableColorSwatch({ defaultValue, action, colors, className }: EditableColorSwatchProps) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  return (
    <ColorSwatchPicker
      value={value}
      colors={colors}
      className={cn(isPending && "opacity-60", className)}
      onChange={(c) => {
        setValue(c);
        startTransition(() => action(c));
      }}
    />
  );
}
