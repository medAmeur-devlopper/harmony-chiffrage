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
  /** Replaces the native OS arrow with a custom one so its inset from the edge can be controlled precisely. */
  customArrow?: boolean;
}

export function EditableSelect({ defaultValue, action, options, className, customArrow }: EditableSelectProps) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => startTransition(() => action(e.target.value))}
      className={cn(
        "cell-input rounded px-2 py-1 text-sm w-full",
        isPending && "opacity-60",
        customArrow && "appearance-none bg-no-repeat",
        className
      )}
      style={
        customArrow
          ? {
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
              backgroundPosition: "right 0.9rem center",
              backgroundSize: "14px",
            }
          : undefined
      }
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-slate-900 bg-white">
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
