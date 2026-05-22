"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/Shell";
import { WeekProgress } from "@/components/WeekProgress";
import { TodayCard } from "@/components/TodayCard";
import { SendSummaryButton } from "@/components/SendSummaryButton";
import { useStoreContext } from "@/lib/store";
import { entriesForWeek, totalHours } from "@/lib/time";

export default function LogPage() {
  const { state, loaded, addEntry, updateEntry, removeEntry } = useStoreContext();

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
        subtitle="Log each block of work as you finish it. The notes go straight to dad."
        right={<SendSummaryButton entries={state.entries} settings={state.settings} />}
      />

      <div className="space-y-6">
        <WeekProgress
          done={hoursDone}
          planned={hoursPlanned}
          target={state.settings.weeklyTarget}
          rate={state.settings.hourlyRate}
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
