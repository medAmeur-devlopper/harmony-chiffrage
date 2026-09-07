import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-6 w-64 rounded-md" />
      <TableSkeleton rows={8} />
    </div>
  );
}
