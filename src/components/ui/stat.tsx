/** Editorial KPI card — shared across chiffrage/synthese/planning/accueil/exigences/epics/share. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hover-card-magnetic rounded-2xl border border-subtle bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}
