"use client";

import { formatHours, formatMoney } from "@/lib/time";

export function WeekProgress({
  done,
  planned,
  target,
  rate,
}: {
  done: number;
  planned: number;
  target: number;
  rate: number;
}) {
  const pctDone = Math.min(100, (done / target) * 100);
  const pctPlanned = Math.min(100, ((done + planned) / target) * 100);
  const owed = done * rate;
  const overTarget = done > target;

  return (
    <section className="card">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">This week</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="display text-4xl">{formatHours(done)}</span>
            <span className="text-[color:var(--color-muted)]">/ {target}h</span>
            {overTarget && <span className="pill pill-warn">over target</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">Owed</div>
          <div className="display mt-1 text-3xl">{formatMoney(owed)}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--color-line)]">
          <div
            className="absolute inset-y-0 left-0 bg-[color:var(--color-accent-soft)]"
            style={{ width: `${pctPlanned}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[color:var(--color-accent)]"
            style={{ width: `${pctDone}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[color:var(--color-muted)]">
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-accent)] align-middle" />{" "}
            done {formatHours(done)}
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-accent-soft)] align-middle border border-[color:var(--color-line)]" />{" "}
            planned {formatHours(planned)}
          </span>
          <span>
            remaining {formatHours(Math.max(0, target - done - planned))}
          </span>
        </div>
      </div>
    </section>
  );
}
