import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { entryHours, formatHours, formatMoney, weekRange } from "@/lib/time";
import type { Entry, Payment } from "@/lib/types";
import { format, isWithinInterval, parseISO, startOfWeek, subWeeks } from "date-fns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function DadPage({ params }: Props) {
  const { token } = await params;
  const sb = getSupabase();

  if (!sb) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="display text-3xl">Not connected</h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted)]">
          This dashboard needs a cloud connection. Ask whoever sent you this link
          to set up Supabase.
        </p>
      </div>
    );
  }

  const { data: settings, error: sErr } = await sb
    .from("settings")
    .select("*")
    .eq("share_token", token)
    .single();

  if (sErr || !settings) {
    notFound();
  }

  const [entriesRes, paymentsRes] = await Promise.all([
    sb.from("entries").select("*").order("date", { ascending: false }),
    sb.from("payments").select("*").order("date", { ascending: false }),
  ]);

  const all: Entry[] = (entriesRes.data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  }));

  const payments: Payment[] = (paymentsRes.data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }));

  const totalEarned = all
    .filter((e) => e.status === "logged")
    .reduce((s, e) => s + entryHours(e), 0) * Number(settings.hourly_rate);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = totalEarned - totalPaid;

  const { start, end } = weekRange();
  const thisWeek = all.filter((e) => {
    const d = parseISO(e.date);
    return e.status === "logged" && isWithinInterval(d, { start, end });
  });

  const lastStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const lastEnd = new Date(lastStart);
  lastEnd.setDate(lastEnd.getDate() + 6);
  const lastWeek = all.filter((e) => {
    const d = parseISO(e.date);
    return e.status === "logged" && d >= lastStart && d <= lastEnd;
  });

  const weekHours = thisWeek.reduce((s, e) => s + entryHours(e), 0);
  const weekOwed = weekHours * Number(settings.hourly_rate);

  const lastWeekHours = lastWeek.reduce((s, e) => s + entryHours(e), 0);
  const lastWeekOwed = lastWeekHours * Number(settings.hourly_rate);

  const recent = all.filter((e) => e.status === "logged").slice(0, 30);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          {settings.dad_name ? `Hi ${settings.dad_name},` : "Weekly timesheet"}
        </div>
        <h1 className="display mt-1 text-3xl sm:text-4xl">
          {settings.my_name ? `${settings.my_name}'s hours` : "Hours summary"}
        </h1>
      </header>

      <section className="card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BalanceStat label="Total earned" value={formatMoney(totalEarned)} />
          <BalanceStat label="Paid" value={`–${formatMoney(totalPaid)}`} muted />
          <BalanceStat
            label="Outstanding"
            value={formatMoney(outstanding)}
            tone={outstanding > 0 ? "accent" : outstanding < 0 ? "warn" : "neutral"}
          />
        </div>
        {outstanding < 0 && (
          <p className="mt-3 text-xs text-[color:var(--color-warn)]">
            You've overpaid by {formatMoney(-outstanding)}.
          </p>
        )}
      </section>

      <section className="card mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WeekStat
            label={`This week (from ${format(start, "EEE d MMM")})`}
            hours={weekHours}
            owed={weekOwed}
            target={Number(settings.weekly_target)}
            highlight
          />
          <WeekStat
            label={`Last week (from ${format(lastStart, "EEE d MMM")})`}
            hours={lastWeekHours}
            owed={lastWeekOwed}
            target={Number(settings.weekly_target)}
          />
        </div>
      </section>

      {payments.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-lg font-semibold">Payments</h2>
          <ul className="mt-3 divide-y divide-[color:var(--color-line)]">
            {payments.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{format(parseISO(p.date), "EEE d MMM yyyy")}</div>
                  {p.note && <div className="text-[color:var(--color-muted)]">{p.note}</div>}
                </div>
                <div className="display tabular-nums">{formatMoney(p.amount)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">This week's entries</h2>
        {thisWeek.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">No hours logged this week yet.</p>
        ) : (
          <DayGroupedList entries={thisWeek} showNotes />
        )}
      </section>

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Recent history</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">Nothing yet.</p>
        ) : (
          <DayGroupedList entries={recent} compact />
        )}
      </section>

      <p className="mt-8 text-center text-xs text-[color:var(--color-muted)]">
        Read-only. Updated live from {settings.my_name ?? "your worker"}'s log.
      </p>
    </div>
  );
}

function DayGroupedList({
  entries,
  showNotes,
  compact,
}: {
  entries: Entry[];
  showNotes?: boolean;
  compact?: boolean;
}) {
  // Group by date, descending date (most recent first), and within a day ascending by start.
  const groups = new Map<string, Entry[]>();
  for (const e of [...entries].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date < b.date ? 1 : -1,
  )) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
  }

  return (
    <div className="mt-3 space-y-4">
      {Array.from(groups.entries()).map(([date, items]) => {
        const total = items.reduce((s, e) => s + entryHours(e), 0);
        const multi = items.length > 1;
        return (
          <div key={date}>
            <div className="flex items-baseline justify-between border-b border-[color:var(--color-line)] pb-1">
              <div className="font-medium">{format(parseISO(date), "EEEE d MMM")}</div>
              <div className="text-sm tabular-nums">
                {multi && (
                  <span className="mr-2 text-[color:var(--color-muted)]">{items.length} blocks · </span>
                )}
                <strong>{formatHours(total)}</strong>
              </div>
            </div>
            <ul className={`mt-2 ${compact ? "space-y-1" : "space-y-2"}`}>
              {items.map((e) => (
                <li key={e.id} className={`flex items-start justify-between ${compact ? "text-sm" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <span className="tabular-nums text-[color:var(--color-ink-2)]">
                      {e.startTime}–{e.endTime}
                    </span>
                    {showNotes && e.notes && (
                      <span className="ml-2 text-[color:var(--color-muted)]">{e.notes}</span>
                    )}
                    {!showNotes && e.notes && (
                      <span className="ml-2 text-[color:var(--color-muted)]">{e.notes}</span>
                    )}
                  </div>
                  <div className="tabular-nums text-[color:var(--color-ink-2)]">
                    {formatHours(entryHours(e))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function BalanceStat({
  label,
  value,
  muted,
  tone = "neutral",
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "neutral" | "accent" | "warn";
}) {
  const cls = muted
    ? "text-[color:var(--color-muted)]"
    : tone === "accent"
    ? "text-[color:var(--color-accent)]"
    : tone === "warn"
    ? "text-[color:var(--color-warn)]"
    : "text-[color:var(--color-ink)]";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">{label}</div>
      <div className={`display mt-1 text-3xl tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function WeekStat({
  label,
  hours,
  owed,
  target,
  highlight,
}: {
  label: string;
  hours: number;
  owed: number;
  target: number;
  highlight?: boolean;
}) {
  const pct = Math.min(100, (hours / target) * 100);
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight
          ? "bg-[color:var(--color-accent-soft)] border border-[color:var(--color-accent)]/40"
          : "bg-[color:var(--color-bg)] border border-[color:var(--color-line)]"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="display text-3xl">{formatHours(hours)}</div>
        <div className="display text-2xl">{formatMoney(owed)}</div>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-[color:var(--color-line)]">
        <div className="h-full rounded-full bg-[color:var(--color-accent)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-[color:var(--color-muted)]">target {target}h</div>
    </div>
  );
}
