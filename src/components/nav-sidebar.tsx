"use client";

import { NavItems } from "./nav-items";

export function NavSidebar({ projectId, userRole }: { projectId: string; userRole: string }) {
  return (
    <nav aria-label="Navigation du projet" className="hidden md:block w-56 shrink-0 space-y-6 py-2">
      <NavItems projectId={projectId} userRole={userRole} />
    </nav>
  );
}

