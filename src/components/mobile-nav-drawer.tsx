"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function MobileNavDrawer({ projectId, userRole }: { projectId: string; userRole: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="text-muted hover:text-primary transition-colors md:hidden"
      >
        <Menu size={22} strokeWidth={1.75} />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-40 overflow-hidden md:hidden transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <nav
          role="dialog"
          aria-modal="true"
          aria-label="Navigation du projet"
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[80vw] space-y-6 overflow-y-auto border-r border-subtle bg-surface px-3 py-4 shadow-xl transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-1">
            <span className="font-display italic text-lg text-brand">Harmony</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="text-muted hover:text-primary transition-colors"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
          <NavItems projectId={projectId} userRole={userRole} onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </>
  );
}
