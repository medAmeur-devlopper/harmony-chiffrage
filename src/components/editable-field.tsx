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
