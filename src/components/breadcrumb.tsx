"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { findNavItemByHref, findSectionByHref } from "@/lib/nav-sections";

export function Breadcrumb({ projectId, projectName }: { projectId: string; projectName: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentHref = segments[segments.length - 1];
  const item = findNavItemByHref(currentHref);
  const section = findSectionByHref(currentHref);

  return (
    <p className="mb-4 text-xs text-muted">
      <Link href={`/projects/${projectId}/accueil`} className="hover:text-primary transition-colors">
        {projectName}
      </Link>
      {section && (
        <>
          <span className="mx-1.5">›</span>
          <span>{section.title}</span>
        </>
      )}
      {item && (
        <>
          <span className="mx-1.5">›</span>
          <span className="text-primary">{item.label}</span>
        </>
      )}
    </p>
  );
}
