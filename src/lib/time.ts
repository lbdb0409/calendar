import { format, startOfWeek, endOfWeek, addDays, parseISO, isWithinInterval } from "date-fns";
import type { Entry } from "./types";

export const WEEK_STARTS_ON = 1 as const; // Monday

export function todayISO(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function weekRange(ref: Date = new Date()) {
  const start = startOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON });
  return { start, end };
}

export function weekDays(ref: Date = new Date()): Date[] {
  const { start } = weekRange(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (end <= start) return 0;
  return (end - start) / 60;
}

export function entryHours(e: Entry): number {
  return hoursBetween(e.startTime, e.endTime);
}

export function entriesForWeek(entries: Entry[], ref: Date = new Date()): Entry[] {
  const { start, end } = weekRange(ref);
  return entries.filter((e) => {
    const d = parseISO(e.date);
    return isWithinInterval(d, { start, end });
  });
}

export function totalHours(entries: Entry[], status?: Entry["status"]): number {
  return entries
    .filter((e) => (status ? e.status === status : true))
    .reduce((sum, e) => sum + entryHours(e), 0);
}

export function formatHours(h: number): string {
  const sign = h < 0 ? "-" : "";
  const abs = Math.abs(h);
  const whole = Math.floor(abs);
  const mins = Math.round((abs - whole) * 60);
  if (mins === 0) return `${sign}${whole}h`;
  return `${sign}${whole}h ${mins}m`;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDayLabel(d: Date): string {
  return format(d, "EEE d MMM");
}

export function shortDay(d: Date): string {
  return format(d, "EEE");
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
