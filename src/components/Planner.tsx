"use client";

import { useState } from "react";
import type { Entry, UniBlock } from "@/lib/types";
import { WeekPlanner } from "./WeekPlanner";
import { MonthCalendar } from "./MonthCalendar";

type View = "week" | "month";

export function Planner({
  entries,
  uniBlocks,
  weeklyTarget,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onAddUni,
  onRemoveUni,
}: {
  entries: Entry[];
  uniBlocks: UniBlock[];
  weeklyTarget: number;
  onAddEntry: (e: Omit<Entry, "id" | "createdAt">) => void;
  onUpdateEntry: (id: string, patch: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddUni: (u: Omit<UniBlock, "id">) => void;
  onRemoveUni: (id: string) => void;
}) {
  const [view, setView] = useState<View>("month");

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Plan your time</h2>
          <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
            Week view focuses on now. Month view lets you plot future weeks.
          </p>
        </div>
        <div className="flex rounded-lg border border-[color:var(--color-line)] p-1 text-xs">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md capitalize ${
                view === v ? "bg-[color:var(--color-ink)] text-[#fff7e8]" : "text-[color:var(--color-ink-2)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {view === "week" ? (
          <WeekPlanner
            entries={entries}
            uniBlocks={uniBlocks}
            weeklyTarget={weeklyTarget}
            onApplySuggestions={(planned) => planned.forEach(onAddEntry)}
            embedded
          />
        ) : (
          <MonthCalendar
            entries={entries}
            uniBlocks={uniBlocks}
            onAddEntry={onAddEntry}
            onUpdateEntry={onUpdateEntry}
            onRemoveEntry={onRemoveEntry}
            onAddUni={onAddUni}
            onRemoveUni={onRemoveUni}
          />
        )}
      </div>
    </section>
  );
}
