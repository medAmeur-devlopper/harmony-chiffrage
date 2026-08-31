"use client";

export function ReadOnlyGuard({ role, children }: { role: string; children: React.ReactNode }) {
  if (role !== "LECTEUR") return <>{children}</>;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
        👁️ Mode consultation — modification désactivée pour votre rôle (Lecteur)
      </div>
      <div className="pointer-events-none opacity-70">{children}</div>
    </div>
  );
}
