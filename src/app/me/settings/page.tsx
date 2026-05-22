"use client";

import { PageHeader } from "@/components/Shell";
import { SettingsCard } from "@/components/SettingsCard";
import { useStoreContext } from "@/lib/store";

export default function SettingsPage() {
  const { state, loaded, cloud, updateSettings } = useStoreContext();

  if (!loaded) {
    return (
      <>
        <PageHeader title="Settings" />
        <div className="card text-sm text-[color:var(--color-muted)]">Reading data…</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your rate, weekly target, dad's email, and the link to share with him."
      />

      <SettingsCard settings={state.settings} onChange={updateSettings} cloud={cloud} />
    </>
  );
}
