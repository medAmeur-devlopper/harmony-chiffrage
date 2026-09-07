import { Fragment, ReactNode } from "react";

/** Splits `title` on the first case-insensitive match of `highlight` and wraps it in the accent span. */
function renderTitleWithHighlight(title: string, highlight: string): ReactNode {
  const index = title.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return title;
  const before = title.slice(0, index);
  const match = title.slice(index, index + highlight.length);
  const after = title.slice(index + highlight.length);
  return (
    <Fragment>
      {before}
      <span className="text-accent">{match}</span>
      {after}
    </Fragment>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  highlight?: string;
  actions?: ReactNode;
}

/** Editorial page header — eyebrow + display title (optionally highlighted) + subtitle + actions. */
export function PageHeader({ eyebrow, title, subtitle, highlight, actions }: PageHeaderProps) {
  return (
    <section className="flex items-start justify-between gap-6">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-muted">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-5xl leading-[1.05] text-primary">
          {highlight ? renderTitleWithHighlight(title, highlight) : title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </section>
  );
}
