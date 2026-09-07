import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-accent-ink font-medium shadow-sm shadow-accent/20 hover:scale-[1.02]",
  secondary: "bg-ink text-white hover:scale-[1.02]",
  ghost: "text-primary hover:bg-surface",
  outline: "border border-primary text-primary hover:bg-primary hover:text-white",
};

/** Editorial pill button — primary/secondary/ghost, used for all form-submit actions across the app. */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none disabled:hover:scale-100",
        VARIANT_CLASSES[variant],
        className
      )}
    />
  );
}
