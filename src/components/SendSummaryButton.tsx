"use client";

import { useState } from "react";
import type { Entry, Settings } from "@/lib/types";
import { entriesForWeek, totalHours, formatHours, formatMoney } from "@/lib/time";
import { format, parseISO } from "date-fns";

export function SendSummaryButton({
  entries,
  settings,
}: {
  entries: Entry[];
  settings: Settings;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const week = entriesForWeek(entries).filter((e) => e.status === "logged");
  const hours = totalHours(week, "logged");
  const owed = hours * settings.hourlyRate;

  function buildText(): string {
    const sorted = [...week].sort(
      (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime.localeCompare(b.startTime)),
    );
    const lines = [
      `Hours summary — week of ${format(new Date(), "d MMM yyyy")}`,
      settings.myName ? `From: ${settings.myName}` : null,
      "",
      ...sorted.map(
        (e) =>
          `• ${format(parseISO(e.date), "EEE d MMM")} ${e.startTime}–${e.endTime} (${formatHours(
            (timeMin(e.endTime) - timeMin(e.startTime)) / 60,
          )})${e.notes ? ` — ${e.notes}` : ""}`,
      ),
      "",
      `Total: ${formatHours(hours)} @ ${formatMoney(settings.hourlyRate)}/hr = ${formatMoney(owed)}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: settings.dadEmail,
          dadName: settings.dadName,
          myName: settings.myName,
          rate: settings.hourlyRate,
          weekStart: new Date().toISOString(),
          entries: week,
        }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; via?: string };
      if (data.ok && data.via === "email") {
        setMsg(`Sent to ${settings.dadEmail}.`);
      } else {
        await navigator.clipboard.writeText(buildText());
        setMsg(
          data.reason
            ? `Email not configured (${data.reason}). Summary copied to clipboard — paste into a message.`
            : "Summary copied to clipboard.",
        );
      }
    } catch (e) {
      await navigator.clipboard.writeText(buildText());
      setMsg("Network issue — summary copied to clipboard so you can paste it manually.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={send} disabled={busy} className="btn btn-primary">
        {busy ? "Sending…" : "Send weekly summary"}
      </button>
      {msg && <div className="text-xs text-[color:var(--color-muted)]">{msg}</div>}
    </div>
  );
}

function timeMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
