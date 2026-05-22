"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";

export function SettingsCard({
  settings,
  onChange,
  cloud,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  cloud: boolean;
}) {
  const [rate, setRate] = useState(String(settings.hourlyRate));
  const [target, setTarget] = useState(String(settings.weeklyTarget));
  const [dadEmail, setDadEmail] = useState(settings.dadEmail ?? "");
  const [dadName, setDadName] = useState(settings.dadName ?? "");
  const [myName, setMyName] = useState(settings.myName ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRate(String(settings.hourlyRate));
    setTarget(String(settings.weeklyTarget));
    setDadEmail(settings.dadEmail ?? "");
    setDadName(settings.dadName ?? "");
    setMyName(settings.myName ?? "");
  }, [settings]);

  function save() {
    onChange({
      hourlyRate: Number(rate) || 0,
      weeklyTarget: Number(target) || 0,
      dadEmail: dadEmail.trim() || undefined,
      dadName: dadName.trim() || undefined,
      myName: myName.trim() || undefined,
    });
  }

  const dadLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/dad/${settings.shareToken}`
      : `/dad/${settings.shareToken}`;

  async function copyLink() {
    await navigator.clipboard.writeText(dadLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card">
      <h2 className="text-lg font-semibold">Settings</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">Hourly rate (AUD)</div>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            onBlur={save}
            min={0}
            className="w-full"
          />
        </label>
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">Weekly target hours</div>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={save}
            min={0}
            className="w-full"
          />
        </label>
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">Your name</div>
          <input
            type="text"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            onBlur={save}
            className="w-full"
          />
        </label>
        <label>
          <div className="text-xs text-[color:var(--color-muted)]">Dad's name</div>
          <input
            type="text"
            value={dadName}
            onChange={(e) => setDadName(e.target.value)}
            onBlur={save}
            className="w-full"
          />
        </label>
        <label className="col-span-2 sm:col-span-4">
          <div className="text-xs text-[color:var(--color-muted)]">Dad's email</div>
          <input
            type="email"
            value={dadEmail}
            onChange={(e) => setDadEmail(e.target.value)}
            onBlur={save}
            placeholder="dad@example.com"
            className="w-full"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">Dad's read-only link</div>
          <div className="mt-1 truncate font-mono text-sm">{dadLink}</div>
        </div>
        <button onClick={copyLink} className="btn btn-secondary">{copied ? "Copied!" : "Copy link"}</button>
      </div>

      <div className="mt-3 text-xs text-[color:var(--color-muted)]">
        {cloud ? "Synced via Supabase." : "Data is in this browser only. Set up Supabase in .env.local to sync."}
      </div>
    </section>
  );
}
