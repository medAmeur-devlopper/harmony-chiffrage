/** Pulse skeleton placeholders shown by route-level loading.tsx while server data resolves. */
export function StatSkeleton() {
  return (
    <div className="skeleton rounded-2xl border border-subtle p-5 h-[84px]" />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-5 space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-8 rounded-md" />
      ))}
    </div>
  );
}
