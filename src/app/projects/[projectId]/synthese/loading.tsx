import { StatSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="skeleton h-6 w-64 rounded-md" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSkeleton rows={5} />
        <TableSkeleton rows={5} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}
