"use client";

import { useMemo } from "react";
import { weekDays, formatHours, todayISO, hoursBetween } from "@/lib/time";
import { format, parseISO } from "date-fns";
import type { Entry, UniBlock } from "@/lib/types";
import { recommendWeek } from "@/lib/recommendations";

export function WeekPlanner({
  entries,
  uniBlocks,
  weeklyTarget,
  onApplySuggestions,
  embedded = false,
}: {
  entries: Entry[];
  uniBlocks: UniBlock[];
  weeklyTarget: number;
  onApplySuggestions: (planned: Omit<Entry, "id" | "createdAt">[]) => void;
  embedded?: boolean;
}) {
  const days = weekDays();
  const today = todayISO();

  const rec = useMemo(
    () => recommendWeek({ entries, uniBlocks, weeklyTarget }),
    [entries, uniBlocks, weeklyTarget],
  );

  function applyAll() {
    const planned: Omit<Entry, "id" | "createdAt">[] = [];
    for (const day of rec.dayPlans) {
      for (const b of day.blocks) {
        if (b.reason === "suggested") {
          planned.push({
            date: day.date,
            startTime: b.startTime,
            endTime: b.endTime,
            notes: "Suggested",
            status: "planned",
          });
        }
      }
    }
    if (planned.length) onApplySuggestions(planned);
  }

  const suggestionCount = rec.dayPlans.reduce(
    (n, d) => n + d.blocks.filter((b) => b.reason === "suggested").length,
    0,
  );

  const inner = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">This week</h2>
            <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
              Uni blocks, your hours, and burnout-aware suggestions.
            </p>
          </div>
          {suggestionCount > 0 && (
            <button onClick={applyAll} className="btn btn-secondary">
              Add all {suggestionCount} suggestions as planned
            </button>
          )}
        </div>
      )}

      {embedded && suggestionCount > 0 && (
        <div className="mb-3 flex justify-end">
          <button onClick={applyAll} className="btn btn-secondary text-xs">
            Add {suggestionCount} suggestion{suggestionCount === 1 ? "" : "s"} as planned
          </button>
        </div>
      )}

      <div className={`${embedded ? "" : "mt-4 "}grid grid-cols-1 gap-2 sm:grid-cols-7`}>
        {days.map((d, i) => {
          const dateStr = todayISO(d);
          const plan = rec.dayPlans[i];
          const isToday = dateStr === today;
          const dayEntries = entries.filter((e) => e.date === dateStr);
          const uniToday = uniBlocks.filter((u) => u.date === dateStr);
          const dayHours = dayEntries.reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);

          return (
            <div
              key={dateStr}
              className={`rounded-xl border p-3 text-sm ${
                isToday
                  ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
                  : "border-[color:var(--color-line)] bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{format(d, "EEE")}</div>
                <div className="text-xs text-[color:var(--color-muted)]">{format(d, "d MMM")}</div>
              </div>

              <div className="mt-2 space-y-1">
                {uniToday.map((u) => (
                  <Block key={u.id} label={u.label ?? "Uni"} start={u.startTime} end={u.endTime} variant="uni" />
                ))}
                {dayEntries.map((e) => (
                  <Block
                    key={e.id}
                    label={e.notes ?? (e.status === "planned" ? "Planned" : "Work")}
                    start={e.startTime}
                    end={e.endTime}
                    variant={e.status === "planned" ? "planned" : "work"}
                  />
                ))}
                {plan?.blocks.filter((b) => b.reason === "suggested").map((b, i) => (
                  <Block
                    key={`sug-${i}`}
                    label="Suggested"
                    start={b.startTime}
                    end={b.endTime}
                    variant="suggested"
                  />
                ))}
                {uniToday.length + dayEntries.length === 0 && plan?.blocks.length === 0 && (
                  <div className="rounded-md border border-dashed border-[color:var(--color-line)] py-3 text-center text-xs text-[color:var(--color-muted)]">
                    —
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[color:var(--color-muted)]">
                  {dayHours > 0 ? formatHours(dayHours) : "0h"}
                </span>
                {uniToday.length > 0 && <span className="pill pill-uni">uni</span>}
              </div>

              {plan?.notes && plan.notes.length > 0 && (
                <div className="mt-2 text-[11px] leading-tight text-[color:var(--color-warn)]">
                  {plan.notes.join(" ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(rec.warnings.length > 0 || rec.tips.length > 0) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rec.warnings.map((w, i) => (
            <div key={i} className="rounded-lg border border-[color:var(--color-warn)] bg-[color:var(--color-warn-soft)] px-3 py-2 text-sm text-[color:var(--color-warn)]">
              {w}
            </div>
          ))}
          {rec.tips.map((t, i) => (
            <div key={i} className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/40 px-3 py-2 text-sm text-[color:var(--color-ink-2)]">
              {t}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return inner;
  return <section className="card">{inner}</section>;
}

function Block({
  label,
  start,
  end,
  variant,
}: {
  label: string;
  start: string;
  end: string;
  variant: "uni" | "work" | "planned" | "suggested";
}) {
  const styles = {
    uni: "bg-[color:var(--color-uni-soft)] text-[color:var(--color-uni)]",
    work: "bg-[color:var(--color-accent)] text-[#fff7e8]",
    planned: "bg-white border border-[color:var(--color-accent)] text-[color:var(--color-accent)]",
    suggested: "bg-white border border-dashed border-[color:var(--color-muted)] text-[color:var(--color-ink-2)]",
  }[variant];
  return (
    <div className={`rounded-md px-2 py-1 text-[11px] ${styles}`}>
      <div className="font-medium tabular-nums">{start}–{end}</div>
      <div className="truncate opacity-80">{label}</div>
    </div>
  );
}
