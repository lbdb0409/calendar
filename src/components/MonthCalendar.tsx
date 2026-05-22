"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
} from "date-fns";
import type { Entry, EntryStatus, UniBlock } from "@/lib/types";
import { entryHours, formatHours, hoursBetween, todayISO, WEEK_STARTS_ON } from "@/lib/time";

type Props = {
  entries: Entry[];
  uniBlocks: UniBlock[];
  onAddEntry: (e: Omit<Entry, "id" | "createdAt">) => void;
  onUpdateEntry: (id: string, patch: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddUni: (u: Omit<UniBlock, "id">) => void;
  onRemoveUni: (id: string) => void;
};

export function MonthCalendar(props: Props) {
  const { entries, uniBlocks } = props;
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
          const totalHrs = dayEntries.reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);
          const hasLogged = dayEntries.some((e) => e.status === "logged");
          const hasPlanned = dayEntries.some((e) => e.status === "planned");

          return (
            <button
              key={dateStr}
              onClick={() => setSelected(dateStr)}
              className={`relative min-h-[80px] rounded-md border p-2 text-left transition ${
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
                {totalHrs > 0 && (
                  <span className="text-[10px] tabular-nums text-[color:var(--color-muted)]">
                    {formatHours(totalHrs)}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-1">
                {dayUni.length > 0 && (
                  <span className="pill pill-uni text-[10px]">uni</span>
                )}
                {hasLogged && <span className="pill pill-accent text-[10px]">done</span>}
                {hasPlanned && <span className="pill pill-muted text-[10px]">planned</span>}
              </div>
            </button>
          );
        })}
      </div>

      <DayDetail
        date={selected}
        entries={entriesByDate.get(selected) ?? []}
        uni={uniByDate.get(selected) ?? []}
        onAddEntry={props.onAddEntry}
        onUpdateEntry={props.onUpdateEntry}
        onRemoveEntry={props.onRemoveEntry}
        onAddUni={props.onAddUni}
        onRemoveUni={props.onRemoveUni}
      />
    </div>
  );
}

function DayDetail({
  date,
  entries,
  uni,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onAddUni,
  onRemoveUni,
}: {
  date: string;
  entries: Entry[];
  uni: UniBlock[];
  onAddEntry: Props["onAddEntry"];
  onUpdateEntry: Props["onUpdateEntry"];
  onRemoveEntry: Props["onRemoveEntry"];
  onAddUni: Props["onAddUni"];
  onRemoveUni: Props["onRemoveUni"];
}) {
  const d = parseISO(date);
  const totalHrs = entries.reduce((s, e) => s + entryHours(e), 0);

  return (
    <div className="mt-5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Selected day
          </div>
          <div className="display mt-0.5 text-xl">{format(d, "EEEE d MMMM")}</div>
        </div>
        {totalHrs > 0 && (
          <div className="text-sm tabular-nums text-[color:var(--color-ink-2)]">
            {formatHours(totalHrs)} this day
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DayList
          title="Work blocks"
          empty="Nothing scheduled."
          items={entries.map((e) => ({
            id: e.id,
            primary: `${e.startTime}–${e.endTime}`,
            secondary: e.notes ?? (e.status === "planned" ? "Planned" : "Done"),
            badge: e.status === "planned" ? "planned" : "done",
            extraActions: e.status === "planned" ? (
              <button
                onClick={() => onUpdateEntry(e.id, { status: "logged" })}
                className="btn btn-secondary text-xs"
              >
                Mark done
              </button>
            ) : null,
            onRemove: () => onRemoveEntry(e.id),
          }))}
        />
        <DayList
          title="Uni"
          empty="No uni this day."
          items={uni.map((u) => ({
            id: u.id,
            primary: `${u.startTime}–${u.endTime}`,
            secondary: u.label ?? "Uni",
            badge: "uni",
            onRemove: () => onRemoveUni(u.id),
          }))}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <QuickAddWork date={date} onAdd={onAddEntry} />
        <QuickAddUni date={date} onAdd={onAddUni} />
      </div>
    </div>
  );
}

function DayList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: {
    id: string;
    primary: string;
    secondary: string;
    badge: "planned" | "done" | "uni";
    extraActions?: React.ReactNode;
    onRemove: () => void;
  }[];
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-white p-3">
      <div className="text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm text-[color:var(--color-muted)]">{empty}</div>
      ) : (
        <ul className="mt-2 divide-y divide-[color:var(--color-line)]">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium">{it.primary}</span>
                  <Badge kind={it.badge} />
                </div>
                <div className="truncate text-[color:var(--color-muted)]">{it.secondary}</div>
              </div>
              <div className="flex items-center gap-1">
                {it.extraActions}
                <button onClick={it.onRemove} className="btn btn-danger text-xs">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
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

function QuickAddWork({
  date,
  onAdd,
}: {
  date: string;
  onAdd: Props["onAddEntry"];
}) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<EntryStatus>("planned");

  const valid = hoursBetween(start, end) > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd({ date, startTime: start, endTime: end, notes: notes.trim() || undefined, status });
    setNotes("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-dashed border-[color:var(--color-line)] bg-white p-3"
    >
      <div className="text-sm font-semibold">Add work block</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as EntryStatus)}
          className="col-span-2 w-full"
        >
          <option value="planned">Planned</option>
          <option value="logged">Done</option>
        </select>
        <input
          type="text"
          placeholder="notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="col-span-2 w-full sm:col-span-3"
        />
        <button type="submit" disabled={!valid} className="btn btn-primary disabled:opacity-50">
          Add
        </button>
      </div>
    </form>
  );
}

function QuickAddUni({
  date,
  onAdd,
}: {
  date: string;
  onAdd: Props["onAddUni"];
}) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("13:00");
  const [label, setLabel] = useState("");

  const valid = hoursBetween(start, end) > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd({ date, startTime: start, endTime: end, label: label.trim() || undefined });
    setLabel("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-dashed border-[color:var(--color-line)] bg-white p-3"
    >
      <div className="text-sm font-semibold">Add uni block</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full" />
        <input
          type="text"
          placeholder="label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="col-span-2 w-full sm:col-span-2"
        />
        <button type="submit" disabled={!valid} className="btn btn-secondary col-span-2 disabled:opacity-50">
          Add
        </button>
      </div>
    </form>
  );
}
