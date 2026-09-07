import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
  Activity,
  Calculator,
  Layers,
  Sigma,
  CalendarRange,
  CalendarDays,
  GanttChartSquare,
  CalendarOff,
  PieChart,
  ShieldAlert,
  FileText,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  adminOnly?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Cadrage",
    items: [
      { href: "accueil", label: "Accueil", icon: Home, shortcut: "g a" },
      { href: "exigences", label: "Exigences", icon: ListChecks, shortcut: "g e" },
      { href: "activite", label: "Activité", icon: Activity, shortcut: "g v" },
    ],
  },
  {
    title: "Chiffrage",
    items: [
      { href: "chiffrage", label: "Chiffrage", icon: Calculator, shortcut: "g c" },
      { href: "epics", label: "Épics", icon: Layers, shortcut: "g i" },
      { href: "formules", label: "Formules", icon: Sigma, shortcut: "g u", adminOnly: true },
    ],
  },
  {
    title: "Planification",
    items: [
      { href: "capacity", label: "Capacity", icon: CalendarRange, shortcut: "g y" },
      { href: "planning", label: "Planning", icon: CalendarDays, shortcut: "g p" },
      { href: "gantt", label: "Gantt", icon: GanttChartSquare, shortcut: "g g" },
      { href: "jours-feries", label: "Jours fériés", icon: CalendarOff, shortcut: "g j" },
    ],
  },
  {
    title: "Livrables",
    items: [
      { href: "synthese", label: "Synthèse", icon: PieChart, shortcut: "g s" },
      { href: "risques", label: "Risques", icon: ShieldAlert, shortcut: "g r" },
      { href: "documents", label: "Documents", icon: FileText, shortcut: "g d" },
      { href: "parametres", label: "Paramètres", icon: Settings, shortcut: "g m" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function findNavItemByHref(href: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.href === href);
}

export function findSectionByHref(href: string): NavSection | undefined {
  return NAV_SECTIONS.find((s) => s.items.some((item) => item.href === href));
}
