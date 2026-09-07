"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface StaffingUpdateResult {
  ok: true;
  overload?: { plannedJH: number; budgetJH: number; pct: number };
}

interface StaffingCellInputProps {
  defaultValue: string;
  action: (value: string) => Promise<StaffingUpdateResult>;
  className?: string;
}

/** Same look as EditableField, but surfaces a transient overload badge when the server action reports one. */
export function StaffingCellInput({ defaultValue, action, className }: StaffingCellInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const [warning, setWarning] = useState<string | null>(null);

  return (
    <div className="static">
      <input
        type="number"
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value === defaultValue) return;
          startTransition(async () => {
            const res = await action(value);
            if (res.overload) {
              setWarning(`+${res.overload.pct.toFixed(0)}% vs budget`);
              setTimeout(() => setWarning(null), 4000);
            }
          });
        }}
        className={cn("cell-input rounded px-2 py-1 text-sm w-full", isPending && "opacity-60", className)}
      />
      {warning && (
        <div className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-lg">
          ⚠ {warning}
        </div>
      )}
    </div>
  );
}
