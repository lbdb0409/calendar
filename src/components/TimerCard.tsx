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

  function handleLog(payload: { startTime: string; endTime: string; notes: string }) {
    if (!showModal) return;
    // Anchor the entry to the day the timer started — that's what feels right
    // even when the actual end time was tweaked.
    const start = new Date(showModal.startedAt);
    onLog({
      date: todayISO(start),
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes.trim() || undefined,
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
  onLog: (payload: { startTime: string; endTime: string; notes: string }) => void;
  onDiscard: () => void;
}) {
  const initialStart = new Date(startedAt);
  const initialEnd = new Date(endedAt);

  const [startStr, setStartStr] = useState(toHHMM(initialStart));
  const [endStr, setEndStr] = useState(toHHMM(initialEnd));
  const [notes, setNotes] = useState("");

  const elapsedHours = diffHours(startStr, endStr);
  const valid = elapsedHours > 0;
  const adjusted = startStr !== toHHMM(initialStart) || endStr !== toHHMM(initialEnd);

  // Close on Escape, log on Cmd/Ctrl+Enter.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDiscard();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && valid) {
        onLog({ startTime: startStr, endTime: endStr, notes });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startStr, endStr, notes, valid, onDiscard, onLog]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Time to log
        </div>
        <div className="display mt-1 text-3xl">
          {valid ? formatHours(elapsedHours) : <span className="text-[color:var(--color-warn)]">—</span>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <div className="mb-1 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
              Start
            </div>
            <input
              type="time"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full"
            />
          </label>
          <label>
            <div className="mb-1 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
              End
            </div>
            <input
              type="time"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className="w-full"
            />
          </label>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-[color:var(--color-muted)]">
            Forgot to stop the timer? Set End to when you actually finished.
          </span>
          {adjusted && (
            <button
              onClick={() => {
                setStartStr(toHHMM(initialStart));
                setEndStr(toHHMM(initialEnd));
              }}
              className="text-[color:var(--color-ink-2)] underline"
              type="button"
            >
              reset
            </button>
          )}
        </div>
        {!valid && (
          <p className="mt-1 text-xs text-[color:var(--color-warn)]">
            End must be after start.
          </p>
        )}

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
          <button
            onClick={() => onLog({ startTime: startStr, endTime: endStr, notes })}
            disabled={!valid}
            className="btn btn-primary disabled:opacity-50"
          >
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

function toHHMM(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function diffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

