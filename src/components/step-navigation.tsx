"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { STEPS } from "@/lib/steps";

export function StepNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.endsWith(`/${s.href}`));
  if (currentIndex === -1) return null;

  const prev = STEPS[currentIndex - 1];
  const next = STEPS[currentIndex + 1];

  return (
    <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
      {prev ? (
        <Link
          href={`/projects/${projectId}/${prev.href}`}
          className="text-sm font-medium text-slate-500 hover:text-[#16314F] transition-colors"
        >
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/projects/${projectId}/${next.href}`}
          className="btn-gold rounded-full text-sm font-semibold px-5 py-2 transition-all"
        >
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
