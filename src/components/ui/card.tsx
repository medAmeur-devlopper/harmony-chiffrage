import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardTone = "surface" | "ink" | "accent" | "mint" | "rose" | "lavender" | "sky" | "cream-warm";

const TONE_CLASSES: Record<CardTone, string> = {
  surface: "bg-surface text-primary",
  ink: "bg-ink text-white",
  accent: "bg-accent text-accent-ink",
  mint: "bg-mint text-ink",
  rose: "bg-rose text-ink",
  lavender: "bg-lavender text-ink",
  sky: "bg-sky text-ink",
  "cream-warm": "bg-cream-warm text-ink",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

/** Clarvos-style floating card — flat color fill, no border, used for every neutral or pastel panel. */
export function Card({ tone = "surface", className, ...props }: CardProps) {
  return <div {...props} className={cn("hover-card-magnetic rounded-2xl p-6", TONE_CLASSES[tone], className)} />;
}
