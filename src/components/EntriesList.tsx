"use client";

import { useMemo, useState } from "react";
import type { Entry } from "@/lib/types";
import { entryHours, formatHours } from "@/lib/time";
import { format, parseISO } from "date-fns";

export function EntriesList({
  entries,
  onUpdate,
  onRemove,
}: {
  entries: Entry[];
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "logged" | "planned">("all");
  const filtered = useMemo(() => {
    return entries
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.startTime < b.startTime ? 1 : -1));
  }, [entries, filter]);

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All entries</h2>
        <div className="flex gap-1 rounded-lg border border-[color:var(--color-line)] p-1 text-xs">
          {(["all", "logged", "planned"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded-md capitalize ${
                filter === k ? "bg-[color:var(--color-ink)] text-[#fff7e8]" : "text-[color:var(--color-ink-2)]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-muted)]">No entries yet — add one above.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[color:var(--color-line)]">
          {filtered.map((e) => (
            <Row key={e.id} entry={e} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: Entry;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [start, setStart] = useState(entry.startTime);
  const [end, setEnd] = useState(entry.endTime);
  const [notes, setNotes] = useState(entry.notes ?? "");

  function save() {
    onUpdate(entry.id, {
      date,
      startTime: start,
      endTime: end,
      notes: notes.trim() || undefined,
    });
    setEditing(false);
  }

  const day = format(parseISO(entry.date), "EEE d MMM");
  const hours = entryHours(entry);

  if (editing) {
    return (
      <li className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-6 sm:items-center">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="notes"
          className="col-span-2"
        />
        <div className="flex justify-end gap-1">
          <button onClick={save} className="btn btn-primary">Save</button>
          <button onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{day}</span>
          <span className="text-sm text-[color:var(--color-muted)]">
            {entry.startTime}–{entry.endTime}
          </span>
          <span className="text-sm">· {formatHours(hours)}</span>
          {entry.status === "planned" && <span className="pill pill-muted">planned</span>}
        </div>
        {entry.notes && (
          <div className="mt-0.5 truncate text-sm text-[color:var(--color-muted)]">{entry.notes}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {entry.status === "planned" && (
          <button
            onClick={() => onUpdate(entry.id, { status: "logged" })}
            className="btn btn-secondary text-xs"
            title="Mark this planned block as done"
          >
            Mark done
          </button>
        )}
        <button onClick={() => setEditing(true)} className="btn btn-ghost text-xs">Edit</button>
        <button onClick={() => onRemove(entry.id)} className="btn btn-danger text-xs">Delete</button>
      </div>
    </li>
  );
}
