import type { Entry, UniBlock } from "./types";
import { hoursBetween, entriesForWeek, totalHours, weekDays, todayISO } from "./time";
import { parseISO, isBefore, startOfDay } from "date-fns";

// ----- constants tuned for a programming-heavy worker -----
// Screen-staring work is harder on eyes than office tasks, so we cap days
// shorter than a typical 8h day and push for a real day off.
const MAX_HOURS_PER_DAY = 5.5;
const PREFERRED_BLOCK_HOURS = 2;
const MIN_BLOCK_HOURS = 1;
const POST_UNI_BUFFER_HOURS = 1; // don't start work within 1h of a uni block ending
const MAX_WORK_DAYS = 5;          // aim for at least 2 days off

// Soft preferences (used in scoring, not as hard rules).
const MORNING_START = 9;
const MORNING_END = 12;
const AFTERNOON_START = 13;
const AFTERNOON_END = 17;
const EVENING_CUTOFF = 20; // avoid scheduling work blocks ending past 8pm

export type DayPlan = {
  date: string;            // YYYY-MM-DD
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  blocks: { startTime: string; endTime: string; reason?: string }[];
  hours: number;
  notes: string[];         // human-readable
};

export type WeekRecommendation = {
  hoursDone: number;
  hoursPlanned: number;
  hoursRemaining: number;
  ok: boolean;
  fitsTarget: boolean;
  dayPlans: DayPlan[];
  warnings: string[];
  tips: string[];
};

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(m: number): string {
  const hh = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

type Range = { start: number; end: number };

function uniRangesForDate(uni: UniBlock[], date: string): Range[] {
  return uni
    .filter((u) => u.date === date)
    .map((u) => ({ start: timeToMin(u.startTime), end: timeToMin(u.endTime) }))
    .sort((a, b) => a.start - b.start);
}

// Returns chunks of free time (minutes) between dayStart and dayEnd that don't
// overlap uni or existing logged/planned entries on that date.
function freeWindows(opts: {
  dayStart: number;
  dayEnd: number;
  uniRanges: Range[];
  entriesForDay: Entry[];
}): Range[] {
  const busy: Range[] = [
    ...opts.uniRanges,
    ...opts.entriesForDay.map((e) => ({
      start: timeToMin(e.startTime),
      end: timeToMin(e.endTime),
    })),
  ].sort((a, b) => a.start - b.start);

  const merged: Range[] = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }

  const free: Range[] = [];
  let cursor = opts.dayStart;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, opts.dayEnd) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= opts.dayEnd) break;
  }
  if (cursor < opts.dayEnd) free.push({ start: cursor, end: opts.dayEnd });

  // Apply post-uni buffer: shrink any window whose start is right after a uni block.
  return free
    .map((w) => {
      const justAfterUni = opts.uniRanges.find(
        (u) => Math.abs(u.end - w.start) <= 5,
      );
      if (justAfterUni) return { ...w, start: w.start + POST_UNI_BUFFER_HOURS * 60 };
      return w;
    })
    .filter((w) => w.end - w.start >= MIN_BLOCK_HOURS * 60);
}

// Score a candidate block 0..1. Higher = better.
function scoreBlock(start: number, end: number): number {
  let score = 0.5;
  // Reward mornings.
  if (start >= MORNING_START * 60 && end <= MORNING_END * 60) score += 0.3;
  // Reward standard daytime.
  if (start >= MORNING_START * 60 && end <= AFTERNOON_END * 60) score += 0.15;
  // Penalize evenings.
  if (end > EVENING_CUTOFF * 60) score -= 0.4;
  // Penalize very early.
  if (start < 8 * 60) score -= 0.3;
  // Reward block lengths near the preferred length.
  const hours = (end - start) / 60;
  score -= Math.abs(hours - PREFERRED_BLOCK_HOURS) * 0.1;
  return score;
}

export function recommendWeek(opts: {
  entries: Entry[];
  uniBlocks: UniBlock[];
  weeklyTarget: number;
  ref?: Date;
}): WeekRecommendation {
  const ref = opts.ref ?? new Date();
  const days = weekDays(ref);
  const today = parseISO(todayISO(ref));

  const thisWeekEntries = entriesForWeek(opts.entries, ref);
  const hoursDone = totalHours(thisWeekEntries, "logged");
  const hoursPlanned = totalHours(thisWeekEntries, "planned");
  const remaining = Math.max(0, opts.weeklyTarget - hoursDone - hoursPlanned);

  const warnings: string[] = [];
  const tips: string[] = [];

  // Build the day plans with existing blocks first.
  const dayPlans: DayPlan[] = days.map((d) => {
    const dateStr = todayISO(d);
    const existing = thisWeekEntries.filter((e) => e.date === dateStr);
    const dow = d.getDay() as DayPlan["dayOfWeek"];
    return {
      date: dateStr,
      dayOfWeek: dow,
      blocks: existing.map((e) => ({
        startTime: e.startTime,
        endTime: e.endTime,
        reason: e.status === "logged" ? "logged" : "planned",
      })),
      hours: existing.reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0),
      notes: [],
    };
  });

  if (remaining <= 0) {
    tips.push(`You're already at ${(hoursDone + hoursPlanned).toFixed(1)}h — nice work.`);
    return finish(dayPlans);
  }

  // Distribute remaining hours across future days.
  let toPlace = remaining;
  const candidates: { plan: DayPlan; window: Range; score: number }[] = [];

  for (const plan of dayPlans) {
    const planDate = parseISO(plan.date);
    // Skip past days (can still log, but don't suggest planning).
    if (isBefore(startOfDay(planDate), startOfDay(today))) continue;

    const uniRanges = uniRangesForDate(opts.uniBlocks, plan.date);
    const entriesForDay = thisWeekEntries.filter((e) => e.date === plan.date);
    const dayStart = 8 * 60;
    const dayEnd = EVENING_CUTOFF * 60;

    const windows = freeWindows({ dayStart, dayEnd, uniRanges, entriesForDay });
    for (const w of windows) {
      candidates.push({ plan, window: w, score: scoreBlock(w.start, w.end) });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  let workingDaysUsed = new Set(
    dayPlans.filter((p) => p.hours > 0).map((p) => p.date),
  );

  for (const c of candidates) {
    if (toPlace <= 0) break;
    if (c.plan.hours >= MAX_HOURS_PER_DAY) continue;

    // Cap variety: don't add a new working day if we already have 5 active.
    if (!workingDaysUsed.has(c.plan.date) && workingDaysUsed.size >= MAX_WORK_DAYS) continue;

    const dayCapacity = MAX_HOURS_PER_DAY - c.plan.hours;
    const windowHours = (c.window.end - c.window.start) / 60;
    const blockHours = Math.min(
      toPlace,
      dayCapacity,
      windowHours,
      PREFERRED_BLOCK_HOURS,
    );
    if (blockHours < MIN_BLOCK_HOURS) continue;

    const endMin = c.window.start + blockHours * 60;
    c.plan.blocks.push({
      startTime: minToTime(c.window.start),
      endTime: minToTime(endMin),
      reason: "suggested",
    });
    c.plan.hours += blockHours;
    toPlace -= blockHours;
    workingDaysUsed.add(c.plan.date);

    // Shrink the window so a later candidate of the same window isn't reused at the same spot.
    c.window.start = endMin + 30; // forced 30min eye break
    if ((c.window.end - c.window.start) / 60 >= MIN_BLOCK_HOURS) {
      candidates.push({ plan: c.plan, window: c.window, score: scoreBlock(c.window.start, c.window.end) - 0.1 });
      candidates.sort((a, b) => b.score - a.score);
    }
  }

  if (toPlace > 0.25) {
    warnings.push(
      `Couldn't fit all ${remaining.toFixed(1)}h — ${toPlace.toFixed(1)}h left over. ` +
      `Either extend a day past ${MAX_HOURS_PER_DAY}h, work on a uni day, or talk to dad about a shorter week.`,
    );
  }

  // Day-level notes
  for (const plan of dayPlans) {
    if (plan.hours > MAX_HOURS_PER_DAY) {
      plan.notes.push(`Over ${MAX_HOURS_PER_DAY}h — heavy screen day, plan a longer break.`);
    }
    if (uniRangesForDate(opts.uniBlocks, plan.date).length > 0 && plan.hours > 0) {
      plan.notes.push("Uni day — keep the work block short and step away after.");
    }
  }

  // Top-level tips
  tips.push("Aim for 2h work blocks with a 20-min screen break between them (20-20-20 rule).");
  tips.push("Keep at least one full day off the computer — your eyes need it.");
  if (hoursDone + hoursPlanned < opts.weeklyTarget) {
    tips.push(`Still need ${(opts.weeklyTarget - hoursDone - hoursPlanned).toFixed(1)}h to hit ${opts.weeklyTarget}h.`);
  }

  return finish(dayPlans);

  function finish(plans: DayPlan[]): WeekRecommendation {
    const planned = plans.reduce((s, p) => s + p.hours, 0);
    return {
      hoursDone,
      hoursPlanned: planned - hoursDone,
      hoursRemaining: Math.max(0, opts.weeklyTarget - planned),
      ok: warnings.length === 0,
      fitsTarget: planned >= opts.weeklyTarget,
      dayPlans: plans,
      warnings,
      tips,
    };
  }
}
