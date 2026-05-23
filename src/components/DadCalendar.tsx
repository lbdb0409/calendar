"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Entry, UniBlock } from "@/lib/types";
import { entryHours, formatHours, hoursBetween, todayISO, WEEK_STARTS_ON } from "@/lib/time";

export function DadCalendar({
  entries,
  uniBlocks,
}: {
  entries: Entry[];
  uniBlocks: UniBlock[];
}) {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<string>(todayISO());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  const entriesByDate = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return m;
  }, [entries]);

  const uniByDate = useMemo(() => {
    const m = new Map<string, UniBlock[]>();
    for (const u of uniBlocks) {
      if (!m.has(u.date)) m.set(u.date, []);
      m.get(u.date)!.push(u);
    }
    return m;
  }, [uniBlocks]);

  const selectedEntries = (entriesByDate.get(selected) ?? []).sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const selectedUni = (uniByDate.get(selected) ?? []).sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="btn btn-ghost"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="display text-xl">{format(cursor, "MMMM yyyy")}</div>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="btn btn-ghost"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <button
          onClick={() => {
            setCursor(new Date());
            setSelected(todayISO());
          }}
          className="btn btn-secondary text-xs"
        >
          Today
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1 text-[color:var(--color-muted)] uppercase tracking-wider">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, monthStart);
          const isToday = isSameDay(d, today);
          const isSelected = dateStr === selected;
          const dayEntries = entriesByDate.get(dateStr) ?? [];
          const dayUni = uniByDate.get(dateStr) ?? [];
          const loggedHrs = dayEntries
            .filter((e) => e.status === "logged")
            .reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);
          const plannedHrs = dayEntries
            .filter((e) => e.status === "planned")
            .reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);

          return (
            <button
              key={dateStr}
              onClick={() => setSelected(dateStr)}
              className={`relative min-h-[78px] rounded-md border p-2 text-left transition ${
                isSelected
                  ? "border-[color:var(--color-ink)] bg-white shadow-sm"
                  : "border-[color:var(--color-line)] bg-white/60 hover:bg-white"
              } ${inMonth ? "" : "opacity-50"}`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-sm tabular-nums ${
                    isToday
                      ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-ink)] font-medium text-[#fff7e8]"
                      : "font-medium"
                  }`}
                >
                  {format(d, "d")}
                </span>
                {(loggedHrs + plannedHrs) > 0 && (
                  <span className="text-[10px] tabular-nums text-[color:var(--color-muted)]">
                    {formatHours(loggedHrs + plannedHrs)}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-1">
                {dayUni.length > 0 && <span className="pill pill-uni text-[10px]">uni</span>}
                {loggedHrs > 0 && <span className="pill pill-accent text-[10px]">done</span>}
                {plannedHrs > 0 && <span className="pill pill-muted text-[10px]">planned</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
              Selected day
            </div>
            <div className="display mt-0.5 text-xl">{format(parseISO(selected), "EEEE d MMMM")}</div>
          </div>
          <DayTotals entries={selectedEntries} />
        </div>

        {selectedEntries.length === 0 && selectedUni.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-muted)]">
            Nothing scheduled or logged on this day.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {selectedUni.length > 0 && (
              <ReadList
                title="Uni"
                items={selectedUni.map((u) => ({
                  primary: `${u.startTime}–${u.endTime}`,
                  secondary: u.label ?? "Uni",
                  badge: "uni",
                }))}
              />
            )}
            {selectedEntries.length > 0 && (
              <ReadList
                title="Work"
                items={selectedEntries.map((e) => ({
                  primary: `${e.startTime}–${e.endTime}`,
                  secondary: e.notes ?? (e.status === "planned" ? "Planned" : "Done"),
                  badge: e.status === "planned" ? "planned" : "done",
                  hours: entryHours(e),
                }))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DayTotals({ entries }: { entries: Entry[] }) {
  const logged = entries
    .filter((e) => e.status === "logged")
    .reduce((s, e) => s + entryHours(e), 0);
  const planned = entries
    .filter((e) => e.status === "planned")
    .reduce((s, e) => s + entryHours(e), 0);
  if (logged + planned === 0) return null;
  return (
    <div className="text-sm tabular-nums text-[color:var(--color-ink-2)]">
      {logged > 0 && <span>{formatHours(logged)} done</span>}
      {logged > 0 && planned > 0 && <span className="mx-1 text-[color:var(--color-muted)]">·</span>}
      {planned > 0 && <span className="text-[color:var(--color-muted)]">{formatHours(planned)} planned</span>}
    </div>
  );
}

function ReadList({
  title,
  items,
}: {
  title: string;
  items: {
    primary: string;
    secondary: string;
    badge: "planned" | "done" | "uni";
    hours?: number;
  }[];
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-white p-3">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="tabular-nums font-medium">{it.primary}</span>
                <Badge kind={it.badge} />
              </div>
              <div className="truncate text-[color:var(--color-muted)]">{it.secondary}</div>
            </div>
            {it.hours !== undefined && (
              <div className="ml-2 tabular-nums text-[color:var(--color-muted)]">
                {formatHours(it.hours)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ kind }: { kind: "planned" | "done" | "uni" }) {
  const map = {
    planned: { cls: "pill pill-muted", text: "planned" },
    done: { cls: "pill pill-accent", text: "done" },
    uni: { cls: "pill pill-uni", text: "uni" },
  } as const;
  return <span className={map[kind].cls}>{map[kind].text}</span>;
}
