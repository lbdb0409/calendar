"use client";

import { useState } from "react";
import type { UniBlock } from "@/lib/types";
import { todayISO, weekRange } from "@/lib/time";
import { addDays, addWeeks, format, parseISO } from "date-fns";

export function UniScheduleEditor({
  blocks,
  onAdd,
  onRemove,
}: {
  blocks: UniBlock[];
  onAdd: (b: Omit<UniBlock, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("13:00");
  const [label, setLabel] = useState("");
  const [repeat, setRepeat] = useState(0); // extra weeks after the first

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = parseISO(date);
    for (let w = 0; w <= repeat; w++) {
      const d = addWeeks(base, w);
      onAdd({
        date: format(d, "yyyy-MM-dd"),
        startTime: start,
        endTime: end,
        label: label.trim() || undefined,
      });
    }
    setLabel("");
  }

  function addThisWeek(dayOffsets: number[]) {
    const { start: monday } = weekRange();
    for (const offset of dayOffsets) {
      const d = addDays(monday, offset);
      onAdd({
        date: format(d, "yyyy-MM-dd"),
        startTime: start,
        endTime: end,
        label: label.trim() || undefined,
      });
    }
  }

  // Group blocks by week for display.
  const grouped = groupByWeek(blocks);

  return (
    <section className="card">
      <h2 className="text-lg font-semibold">Uni schedule</h2>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">
        Add specific days you're at uni. The planner avoids those times and won't
        suggest work right after a class.
      </p>

      <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
        <label className="col-span-2">
          <div className="text-xs text-[color:var(--color-muted)]">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </label>
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">Start</div>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
        </label>
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">End</div>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full" />
        </label>
        <label className="col-span-2">
          <div className="text-xs text-[color:var(--color-muted)]">Label (optional)</div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="eg. COMP3308 lecture"
            className="w-full"
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary w-full">Add</button>
        </div>

        <label className="col-span-2 sm:col-span-7 flex items-center gap-2 text-xs text-[color:var(--color-muted)]">
          <span>Repeat weekly for</span>
          <input
            type="number"
            min={0}
            max={20}
            value={repeat}
            onChange={(e) => setRepeat(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
            className="w-16"
          />
          <span>more {repeat === 1 ? "week" : "weeks"} after this one (0 = just once).</span>
        </label>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[color:var(--color-line)] p-3 text-sm">
        <span className="text-[color:var(--color-muted)]">Quick add for this week:</span>
        <button
          type="button"
          onClick={() => addThisWeek([0, 1, 2])}
          className="btn btn-secondary text-xs"
        >
          Mon + Tue + Wed
        </button>
        <button type="button" onClick={() => addThisWeek([0])} className="btn btn-secondary text-xs">Mon</button>
        <button type="button" onClick={() => addThisWeek([1])} className="btn btn-secondary text-xs">Tue</button>
        <button type="button" onClick={() => addThisWeek([2])} className="btn btn-secondary text-xs">Wed</button>
        <button type="button" onClick={() => addThisWeek([3])} className="btn btn-secondary text-xs">Thu</button>
        <button type="button" onClick={() => addThisWeek([4])} className="btn btn-secondary text-xs">Fri</button>
        <span className="text-xs text-[color:var(--color-muted)]">
          (uses the time + label you've typed above)
        </span>
      </div>

      {blocks.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-muted)]">No uni blocks yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                {group.label}
              </div>
              <ul className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--color-line)] bg-white px-3 py-2"
                  >
                    <div>
                      <span className="pill pill-uni">{format(parseISO(b.date), "EEE d MMM")}</span>
                      <span className="ml-2 text-sm tabular-nums">{b.startTime}–{b.endTime}</span>
                      {b.label && <span className="ml-2 text-sm text-[color:var(--color-muted)]">{b.label}</span>}
                    </div>
                    <button onClick={() => onRemove(b.id)} className="btn btn-danger text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function groupByWeek(blocks: UniBlock[]): { key: string; label: string; items: UniBlock[] }[] {
  const sorted = [...blocks].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
  );
  const groups = new Map<string, UniBlock[]>();
  for (const b of sorted) {
    const d = parseISO(b.date);
    const { start } = weekRange(d);
    const key = format(start, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: `Week of ${format(parseISO(key), "d MMM")}`,
    items,
  }));
}
