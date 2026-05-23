"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Entry, Payment } from "@/lib/types";
import { entryHours, formatMoney, todayISO } from "@/lib/time";

export function BalanceCard({
  entries,
  payments,
  hourlyRate,
  onAdd,
  onRemove,
}: {
  entries: Entry[];
  payments: Payment[];
  hourlyRate: number;
  onAdd: (p: Omit<Payment, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
}) {
  const earned = useMemo(
    () => entries.filter((e) => e.status === "logged").reduce((s, e) => s + entryHours(e), 0) * hourlyRate,
    [entries, hourlyRate],
  );
  const paid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const outstanding = earned - paid;

  const [showForm, setShowForm] = useState(false);

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Balance</h2>
          <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
            Hours earned, what dad's paid, what's outstanding.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary">
          {showForm ? "Cancel" : "Dad paid me"}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-4">
        <Stat label="Earned" value={formatMoney(earned)} tone="neutral" />
        <Stat label="Paid" value={`–${formatMoney(paid)}`} tone="muted" />
        <Stat
          label="Outstanding"
          value={formatMoney(outstanding)}
          tone={outstanding > 0 ? "accent" : outstanding < 0 ? "warn" : "neutral"}
        />
      </dl>
      {outstanding < 0 && (
        <p className="mt-2 text-xs text-[color:var(--color-warn)]">
          Dad's overpaid by {formatMoney(-outstanding)}.
        </p>
      )}

      {showForm && (
        <PaymentForm
          onAdd={(p) => {
            onAdd(p);
            setShowForm(false);
          }}
        />
      )}

      {payments.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Recent payments
          </div>
          <ul className="mt-2 divide-y divide-[color:var(--color-line)]">
            {[...payments]
              .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
              .slice(0, 8)
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{format(parseISO(p.date), "EEE d MMM yyyy")}</div>
                    {p.note && <div className="text-[color:var(--color-muted)]">{p.note}</div>}
                  </div>
                  <div className="display ml-3 tabular-nums">{formatMoney(p.amount)}</div>
                  <button
                    onClick={() => onRemove(p.id)}
                    className="btn btn-danger ml-2 text-xs"
                    title="Remove this payment"
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "accent" | "warn" | "muted";
}) {
  const cls = {
    neutral: "text-[color:var(--color-ink)]",
    accent: "text-[color:var(--color-accent)]",
    warn: "text-[color:var(--color-warn)]",
    muted: "text-[color:var(--color-muted)]",
  }[tone];
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">{label}</dt>
      <dd className={`display mt-1 text-2xl tabular-nums ${cls}`}>{value}</dd>
    </div>
  );
}

function PaymentForm({
  onAdd,
}: {
  onAdd: (p: Omit<Payment, "id" | "createdAt">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const parsed = Number(amount);
  const valid = isFinite(parsed) && parsed > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onAdd({ date, amount: parsed, note: note.trim() || undefined });
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-4">
      <div className="text-sm font-semibold">Record payment</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="col-span-1">
          <div className="mb-1 text-xs text-[color:var(--color-muted)]">Amount (AUD)</div>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="w-full"
            autoFocus
          />
        </label>
        <label className="col-span-1">
          <div className="mb-1 text-xs text-[color:var(--color-muted)]">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </label>
        <label className="col-span-2 sm:col-span-2">
          <div className="mb-1 text-xs text-[color:var(--color-muted)]">Note (optional)</div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="bank transfer / cash"
            className="w-full"
          />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={!valid} className="btn btn-primary w-full disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
