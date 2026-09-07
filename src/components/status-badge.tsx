import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus } from "@/lib/constants";

const STATUS_ICONS: Record<ProjectStatus, React.ReactNode> = {
  DRAFT: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <path
        d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  SUBMITTED: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  APPROVED: (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors = PROJECT_STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}
    >
      {STATUS_ICONS[status]}
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
