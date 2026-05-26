import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string | number): string {
  const target = new Date(date);
  const diff = Date.now() - target.getTime();
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;
  return target.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
