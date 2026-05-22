"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Entry } from "@/lib/types";
import { entryHours, formatHours, hoursBetween, todayISO } from "@/lib/time";

export function TodayCard({
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: {
  entries: Entry[];
  onAdd: (e: Omit<Entry, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
}) {
  const [showingDate, setShowingDate] = useState<string>(todayISO());

  // Refresh "today" if the user has the tab open across midnight.
  useEffect(() => {
    const t = setInterval(() => {
      const now = todayISO();
      if (now !== showingDate) setShowingDate(now);
    }, 60_000);
    return () => clearInterval(t);
  }, [showingDate]);

  const today = showingDate;
  const blocks = useMemo(
    () =>
      entries
        .filter((e) => e.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [entries, today],
  );
  const logged = blocks.filter((b) => b.status === "logged");
  const totalLogged = logged.reduce((s, b) => s + entryHours(b), 0);

  return (
    <section className="card">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Today</h2>
          <div className="mt-0.5 text-sm text-[color:var(--color-muted)]">
            {format(parseISO(today), "EEEE d MMMM")}
          </div>
        </div>
        <div className="text-right">
          <div className="display text-2xl tabular-nums">{formatHours(totalLogged)}</div>
          <div className="text-xs text-[color:var(--color-muted)]">
            {logged.length} {logged.length === 1 ? "block" : "blocks"} logged
          </div>
        </div>
      </header>

      {blocks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {blocks.map((b) => (
            <BlockRow key={b.id} block={b} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <AddBlock
        date={today}
        existing={blocks}
        onAdd={onAdd}
        empty={blocks.length === 0}
      />
    </section>
  );
}

function BlockRow({
  block,
  onUpdate,
  onRemove,
}: {
  block: Entry;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(block.startTime);
  const [end, setEnd] = useState(block.endTime);
  const [notes, setNotes] = useState(block.notes ?? "");

  function save() {
    onUpdate(block.id, {
      startTime: start,
      endTime: end,
      notes: notes.trim() || undefined,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-[color:var(--color-line)] bg-white p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="what you finished"
            className="col-span-2"
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={save} className="btn btn-primary text-xs">Save</button>
          <button onClick={() => setEditing(false)} className="btn btn-ghost text-xs">Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--color-line)] bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="tabular-nums font-medium">
            {block.startTime}–{block.endTime}
          </span>
          <span className="text-[color:var(--color-muted)]">· {formatHours(entryHours(block))}</span>
          {block.status === "planned" && <span className="pill pill-muted">planned</span>}
          {block.status === "logged" && <span className="pill pill-accent">done</span>}
        </div>
        {block.notes ? (
          <p className="mt-1 text-sm text-[color:var(--color-ink-2)]">{block.notes}</p>
        ) : (
          <p className="mt-1 text-sm italic text-[color:var(--color-muted)]">
            No notes — add some so dad sees what you did.
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {block.status === "planned" && (
          <button
            onClick={() => onUpdate(block.id, { status: "logged" })}
            className="btn btn-secondary text-xs"
          >
            Mark done
          </button>
        )}
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="btn btn-ghost text-xs">Edit</button>
          <button onClick={() => onRemove(block.id)} className="btn btn-danger text-xs">Delete</button>
        </div>
      </div>
    </li>
  );
}

function AddBlock({
  date,
  existing,
  onAdd,
  empty,
}: {
  date: string;
  existing: Entry[];
  onAdd: (e: Omit<Entry, "id" | "createdAt">) => void;
  empty: boolean;
}) {
  // Default start = end of the last block today (or 9:00 if none).
  const defaultStart = useMemo(() => {
    if (existing.length === 0) return "09:00";
    const last = [...existing].sort((a, b) => a.endTime.localeCompare(b.endTime)).at(-1)!;
    return last.endTime;
  }, [existing]);

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(currentTimeRounded());
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  // Re-anchor start when a new block lands above us.
  useEffect(() => {
    setStart(defaultStart);
  }, [defaultStart]);

  const hours = hoursBetween(start, end);
  const valid = hours > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      date,
      startTime: start,
      endTime: end,
      notes: notes.trim() || undefined,
      status: "logged",
    });
    setSaved(`+${formatHours(hours)} logged. Add the next one when you finish.`);
    setNotes("");
    setEnd(currentTimeRounded());
    setTimeout(() => setSaved(null), 3500);
  }

  return (
    <form
      onSubmit={submit}
      className={`mt-4 rounded-xl border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-4 ${
        empty ? "" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          {empty ? "Log your first block" : "Log another block"}
        </div>
        <div className="text-xs text-[color:var(--color-muted)]">
          Each chunk is its own row — your day totals automatically.
        </div>
      </div>

      <label className="mt-3 block">
        <div className="mb-1 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          What you finished
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="eg. fixed customer search bug, exported quotes report"
          rows={3}
          className="w-full resize-y"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="col-span-1">
          <div className="mb-1 text-xs text-[color:var(--color-muted)]">Start</div>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
        </label>
        <label className="col-span-1">
          <div className="mb-1 text-xs text-[color:var(--color-muted)]">End</div>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full" />
        </label>
        <button
          type="button"
          onClick={() => setEnd(currentTimeRounded())}
          className="btn btn-ghost mt-5 text-xs"
        >
          end = now
        </button>
        <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-2">
          {saved && <span className="text-xs text-[color:var(--color-accent)]">{saved}</span>}
          {valid ? (
            <span className="text-sm text-[color:var(--color-ink-2)]">
              <strong>{formatHours(hours)}</strong>
            </span>
          ) : (
            <span className="text-sm text-[color:var(--color-warn)]">End must be after start.</span>
          )}
          <button type="submit" disabled={!valid} className="btn btn-primary disabled:opacity-50">
            {empty ? "Log this" : "Add block"}
          </button>
        </div>
      </div>
    </form>
  );
}

function currentTimeRounded(): string {
  const now = new Date();
  const m = now.getMinutes();
  const rounded = Math.round(m / 15) * 15;
  let hours = now.getHours();
  let mins = rounded % 60;
  if (rounded >= 60) hours += 1;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
