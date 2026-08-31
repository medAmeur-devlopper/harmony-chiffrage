"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { STEPS } from "@/lib/steps";

export function NavTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-7xl px-6 flex gap-1 overflow-x-auto pb-3">
      {STEPS.map((tab) => {
        const active = pathname.endsWith(`/${tab.href}`);
        return (
          <Link
            key={tab.href}
            href={`/projects/${projectId}/${tab.href}`}
            className={
              active
                ? "whitespace-nowrap text-sm font-semibold px-3 py-1.5 rounded-full btn-gold"
                : "whitespace-nowrap text-sm px-3 py-1.5 rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
