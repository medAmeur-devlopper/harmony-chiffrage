import { StatSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-6 w-64 rounded-md" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
