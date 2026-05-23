import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { entryHours, formatHours, formatMoney, weekRange } from "@/lib/time";
import type { Entry, Payment, UniBlock } from "@/lib/types";
import { addDays, format, isWithinInterval, parseISO, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { DadCalendar } from "@/components/DadCalendar";

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

  const [entriesRes, paymentsRes, uniRes] = await Promise.all([
    sb.from("entries").select("*").order("date", { ascending: false }),
    sb.from("payments").select("*").order("date", { ascending: false }),
    sb.from("uni_blocks").select("*"),
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

  const uniBlocks: UniBlock[] = (uniRes.data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    label: row.label ?? undefined,
  }));

  // Upcoming: planned work + uni in the next 14 days (incl. today).
  const today = startOfDay(new Date());
  const horizon = addDays(today, 14);
  const upcomingEntries = all.filter((e) => {
    if (e.status !== "planned") return false;
    const d = parseISO(e.date);
    return d >= today && d <= horizon;
  });
  const upcomingUni = uniBlocks.filter((u) => {
    const d = parseISO(u.date);
    return d >= today && d <= horizon;
  });

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

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
          Browse any month. Tap a day to see what's planned, done, or uni.
        </p>
        <div className="mt-4">
          <DadCalendar entries={all} uniBlocks={uniBlocks} />
        </div>
      </section>

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Next 14 days</h2>
        <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
          Quick digest of what {settings.my_name ?? "they"} has planned soon.
        </p>
        <UpcomingSchedule entries={upcomingEntries} uni={upcomingUni} rate={Number(settings.hourly_rate)} />
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

function UpcomingSchedule({
  entries,
  uni,
  rate,
}: {
  entries: Entry[];
  uni: UniBlock[];
  rate: number;
}) {
  // Merge entries + uni into one set of dates.
  const dates = new Set<string>();
  for (const e of entries) dates.add(e.date);
  for (const u of uni) dates.add(u.date);

  if (dates.size === 0) {
    return (
      <p className="mt-3 text-sm text-[color:var(--color-muted)]">
        Nothing planned in the next 14 days yet.
      </p>
    );
  }

  const sorted = Array.from(dates).sort();
  const totalPlannedHours = entries.reduce(
    (s, e) => s + (timeMin(e.endTime) - timeMin(e.startTime)) / 60,
    0,
  );

  return (
    <div className="mt-3">
      {totalPlannedHours > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent-soft)] px-3 py-1 text-xs text-[color:var(--color-accent)]">
          <strong>{formatHours(totalPlannedHours)}</strong> of work planned ·{" "}
          <strong>{formatMoney(totalPlannedHours * rate)}</strong>
        </div>
      )}
      <ul className="space-y-3">
        {sorted.map((date) => {
          const dayEntries = entries
            .filter((e) => e.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const dayUni = uni
            .filter((u) => u.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const workHours = dayEntries.reduce(
            (s, e) => s + (timeMin(e.endTime) - timeMin(e.startTime)) / 60,
            0,
          );
          return (
            <li key={date} className="rounded-lg border border-[color:var(--color-line)] bg-white p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{format(parseISO(date), "EEEE d MMM")}</div>
                <div className="flex items-center gap-2 text-sm">
                  {dayUni.length > 0 && <span className="pill pill-uni">uni</span>}
                  {workHours > 0 && (
                    <span className="tabular-nums text-[color:var(--color-ink-2)]">
                      {formatHours(workHours)}
                    </span>
                  )}
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {dayUni.map((u) => (
                  <li key={u.id} className="flex items-baseline justify-between text-sm">
                    <span className="text-[color:var(--color-uni)]">
                      <span className="tabular-nums">{u.startTime}–{u.endTime}</span>
                      <span className="ml-2">{u.label ?? "Uni"}</span>
                    </span>
                  </li>
                ))}
                {dayEntries.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between text-sm">
                    <span className="text-[color:var(--color-ink-2)]">
                      <span className="tabular-nums">{e.startTime}–{e.endTime}</span>
                      {e.notes && <span className="ml-2 text-[color:var(--color-muted)]">{e.notes}</span>}
                    </span>
                    <span className="tabular-nums text-[color:var(--color-muted)]">
                      {formatHours((timeMin(e.endTime) - timeMin(e.startTime)) / 60)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function timeMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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
