"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NAV_SECTIONS } from "@/lib/nav-sections";
import { cn } from "@/lib/utils";

export function NavSidebar({ projectId, userRole }: { projectId: string; userRole: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation du projet" className="w-56 shrink-0 space-y-6 py-2">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => !item.adminOnly || userRole === "ADMIN");
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted">{section.title}</p>
            <div className="mt-1.5 space-y-0.5">
              {items.map((item) => {
                const active = pathname.endsWith(`/${item.href}`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={`/projects/${projectId}/${item.href}`}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors",
                      active ? "bg-accent/8 font-medium text-accent" : "text-muted hover:bg-app hover:text-primary"
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
