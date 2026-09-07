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
    <div className="mt-8 flex items-center justify-between border-t border-subtle pt-4">
      {prev ? (
        <Link
          href={`/projects/${projectId}/${prev.href}`}
          className="text-sm font-medium text-muted hover:text-accent transition-colors"
        >
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/projects/${projectId}/${next.href}`}
          className="rounded-full bg-accent text-white text-sm font-semibold px-5 py-2 transition-all hover:scale-[1.02]"
        >
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
