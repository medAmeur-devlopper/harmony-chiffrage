"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { ALL_NAV_ITEMS } from "@/lib/nav-sections";
import { cn } from "@/lib/utils";

export function CommandPalette({ projectId, userRole }: { projectId: string; userRole: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => ALL_NAV_ITEMS.filter((item) => !item.adminOnly || userRole === "ADMIN"), [userRole]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q));
  }, [items, query]);

  // Global ⌘K / Ctrl+K to open, Esc to close.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function navigateTo(href: string) {
    setOpen(false);
    router.push(`/projects/${projectId}/${href}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) navigateTo(item.href);
    } else if (e.key === "Tab") {
      // Basic focus trap: keep focus inside the panel.
      e.preventDefault();
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="relative w-[560px] max-w-[90vw] rounded-2xl border border-subtle bg-surface shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
          <Search size={16} className="text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aller à…"
            aria-label="Rechercher une page"
            className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-subtle px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Résultats">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat</li>}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  aria-label={item.label}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateTo(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === activeIndex ? "bg-accent/8 text-accent" : "text-primary hover:bg-app"
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="rounded border border-subtle px-1.5 py-0.5 text-[10px] text-muted">
                    {item.shortcut}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
