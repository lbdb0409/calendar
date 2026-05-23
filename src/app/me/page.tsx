"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/Shell";
import { WeekProgress } from "@/components/WeekProgress";
import { TimerCard } from "@/components/TimerCard";
import { BalanceCard } from "@/components/BalanceCard";
import { TodayCard } from "@/components/TodayCard";
import { SendSummaryButton } from "@/components/SendSummaryButton";
import { useStoreContext } from "@/lib/store";
import { entriesForWeek, totalHours } from "@/lib/time";

export default function LogPage() {
  const {
    state,
    loaded,
    addEntry,
    updateEntry,
    removeEntry,
    addPayment,
    removePayment,
    startTimer,
    stopTimer,
  } = useStoreContext();

  const week = useMemo(() => entriesForWeek(state.entries), [state.entries]);
  const hoursDone = totalHours(week, "logged");
  const hoursPlanned = totalHours(week, "planned");

  if (!loaded) {
    return (
      <>
        <PageHeader title="Log" />
        <div className="card text-sm text-[color:var(--color-muted)]">Reading data…</div>
      </>
    );
  }

  const greeting = state.settings.myName ? `Hey ${state.settings.myName}` : "Today";

  return (
    <>
      <PageHeader
        title={greeting}
        subtitle="Use the timer when you sit down, or log a block manually. Notes go to dad."
        right={<SendSummaryButton entries={state.entries} settings={state.settings} />}
      />

      <div className="space-y-6">
        <TimerCard
          timer={state.timer}
          onStart={startTimer}
          onStop={stopTimer}
          onLog={addEntry}
        />

        <WeekProgress
          done={hoursDone}
          planned={hoursPlanned}
          target={state.settings.weeklyTarget}
          rate={state.settings.hourlyRate}
        />

        <BalanceCard
          entries={state.entries}
          payments={state.payments}
          hourlyRate={state.settings.hourlyRate}
          onAdd={addPayment}
          onRemove={removePayment}
        />

        <TodayCard
          entries={state.entries}
          onAdd={addEntry}
          onUpdate={updateEntry}
          onRemove={removeEntry}
        />
      </div>
    </>
  );
}
