"use client";

import { PageHeader } from "@/components/Shell";
import { Planner } from "@/components/Planner";
import { EntriesList } from "@/components/EntriesList";
import { UniScheduleEditor } from "@/components/UniScheduleEditor";
import { useStoreContext } from "@/lib/store";

export default function SchedulePage() {
  const { state, loaded, addEntry, updateEntry, removeEntry, addUni, removeUni } = useStoreContext();

  if (!loaded) {
    return (
      <>
        <PageHeader title="Schedule" />
        <div className="card text-sm text-[color:var(--color-muted)]">Reading data…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Plan ahead, see uni days, and look back at everything you've done."
      />

      <div className="space-y-6">
        <Planner
          entries={state.entries}
          uniBlocks={state.uniBlocks}
          weeklyTarget={state.settings.weeklyTarget}
          onAddEntry={addEntry}
          onUpdateEntry={updateEntry}
          onRemoveEntry={removeEntry}
          onAddUni={addUni}
          onRemoveUni={removeUni}
        />

        <UniScheduleEditor blocks={state.uniBlocks} onAdd={addUni} onRemove={removeUni} />

        <EntriesList entries={state.entries} onUpdate={updateEntry} onRemove={removeEntry} />
      </div>
    </>
  );
}
