"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { ActiveTimer, Entry } from "@/lib/types";
import { formatHours, todayISO } from "@/lib/time";

export function TimerCard({
  timer,
  onStart,
  onStop,
  onLog,
}: {
  timer: ActiveTimer | null;
  onStart: () => void;
  onStop: () => void;
  onLog: (e: Omit<Entry, "id" | "createdAt">) => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showModal, setShowModal] = useState<{ startedAt: string; endedAt: string } | null>(null);

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);

  function handleStop() {
    if (!timer) return;
    const endedAt = new Date().toISOString();
    setShowModal({ startedAt: timer.startedAt, endedAt });
    onStop();
  }

  function handleLog(notes: string) {
    if (!showModal) return;
    const start = new Date(showModal.startedAt);
    const end = new Date(showModal.endedAt);
    onLog({
      date: todayISO(start),
      startTime: roundedTime(start),
      endTime: roundedTime(end),
      notes: notes.trim() || undefined,
      status: "logged",
    });
    setShowModal(null);
  }

  function handleDiscard() {
    setShowModal(null);
  }

  if (!timer) {
    return (
      <>
        <section className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Timer</h2>
              <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
                Hit start when you sit down to work. Hit stop to log the block.
              </p>
            </div>
            <button onClick={onStart} className="btn btn-primary text-base">
              <span aria-hidden>▶</span> Start working
            </button>
          </div>
        </section>
        {showModal && <StopModal {...showModal} onLog={handleLog} onDiscard={handleDiscard} />}
      </>
    );
  }

  const startedAt = new Date(timer.startedAt);
  const elapsedMs = Math.max(0, nowMs - startedAt.getTime());

  return (
    <>
      <section className="card border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/40">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--color-accent)]" />
              <h2 className="text-lg font-semibold">Working…</h2>
            </div>
            <p className="mt-1 text-sm text-[color:var(--color-muted)]">
              Started {format(startedAt, "h:mm a")}
            </p>
          </div>
          <div className="display text-5xl tabular-nums sm:text-6xl">
            {formatElapsed(elapsedMs)}
          </div>
          <button onClick={handleStop} className="btn btn-primary text-base">
            <span aria-hidden>■</span> Stop
          </button>
        </div>
      </section>
      {showModal && <StopModal {...showModal} onLog={handleLog} onDiscard={handleDiscard} />}
    </>
  );
}

function StopModal({
  startedAt,
  endedAt,
  onLog,
  onDiscard,
}: {
  startedAt: string;
  endedAt: string;
  onLog: (notes: string) => void;
  onDiscard: () => void;
}) {
  const [notes, setNotes] = useState("");
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const elapsedHours = (end.getTime() - start.getTime()) / 1000 / 3600;

  // Close on Escape, log on Cmd/Ctrl+Enter.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDiscard();
      if ((e.key === "Enter") && (e.metaKey || e.ctrlKey)) onLog(notes);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notes, onDiscard, onLog]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Time to log
        </div>
        <div className="display mt-1 text-3xl">{formatHours(elapsedHours)}</div>
        <div className="text-sm text-[color:var(--color-muted)]">
          {format(start, "h:mm a")} – {format(end, "h:mm a")}
        </div>

        <label className="mt-4 block">
          <div className="mb-1 text-sm font-medium">What did you finish?</div>
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="eg. exported the quotes report, fixed the customer search bug"
            className="w-full resize-y"
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={onDiscard} className="btn btn-ghost">
            Discard (won't be logged)
          </button>
          <button onClick={() => onLog(notes)} className="btn btn-primary">
            Log block
          </button>
        </div>
        <p className="mt-2 text-right text-[11px] text-[color:var(--color-muted)]">
          ⌘+Enter to log · Esc to discard
        </p>
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function roundedTime(d: Date): string {
  // Round to the nearest minute so the entry's start/end are clean HH:MM.
  const minutes = d.getHours() * 60 + d.getMinutes() + Math.round(d.getSeconds() / 60);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
