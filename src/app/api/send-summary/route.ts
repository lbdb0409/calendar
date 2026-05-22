import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { Entry } from "@/lib/types";
import { format, parseISO } from "date-fns";

type Payload = {
  to?: string;
  dadName?: string;
  myName?: string;
  rate: number;
  weekStart: string;
  entries: Entry[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as Payload;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUMMARY_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "RESEND_API_KEY not set" });
  }
  if (!body.to) {
    return NextResponse.json({ ok: false, reason: "no recipient email in settings" });
  }

  const totalHours = body.entries.reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);
  const owed = totalHours * body.rate;
  const greeting = body.dadName ? `Hi ${body.dadName},` : "Hi,";
  const senderName = body.myName ?? "Your worker";

  const sorted = [...body.entries].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
  );

  // Group entries by date so multi-block days show one header + subtotal.
  const grouped = new Map<string, typeof sorted>();
  for (const e of sorted) {
    if (!grouped.has(e.date)) grouped.set(e.date, []);
    grouped.get(e.date)!.push(e);
  }

  const rows = Array.from(grouped.entries())
    .map(([date, items]) => {
      const dayTotal = items.reduce((s, e) => s + hoursBetween(e.startTime, e.endTime), 0);
      const blockRows = items
        .map(
          (e, i) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f4f0e6;color:#888;">${i === 0 ? format(parseISO(date), "EEE d MMM") : ""}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f4f0e6;font-variant-numeric:tabular-nums;">${e.startTime}–${e.endTime}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f4f0e6;font-variant-numeric:tabular-nums;">${fmtHours(hoursBetween(e.startTime, e.endTime))}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f4f0e6;color:#444;">${escapeHtml(e.notes ?? "")}</td>
        </tr>`,
        )
        .join("");
      const subtotalRow = items.length > 1
        ? `
        <tr style="background:#fbf9f3;">
          <td style="padding:4px 12px;border-bottom:1px solid #e7e2d6;color:#666;font-size:12px;">${items.length} blocks</td>
          <td colspan="2" style="padding:4px 12px;border-bottom:1px solid #e7e2d6;font-variant-numeric:tabular-nums;font-size:12px;"><strong>${fmtHours(dayTotal)}</strong> day total</td>
          <td style="padding:4px 12px;border-bottom:1px solid #e7e2d6;"></td>
        </tr>`
        : `<tr><td colspan="4" style="border-bottom:1px solid #e7e2d6;"></td></tr>`;
      return blockRows + subtotalRow;
    })
    .join("");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f1a14;max-width:600px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">Here are my hours for the week of ${format(parseISO(body.weekStart), "d MMM yyyy")}:</p>

      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:20px;">
        <thead>
          <tr style="text-align:left;background:#f8f6f1;">
            <th style="padding:8px 12px;border-bottom:1px solid #e7e2d6;">Day</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e7e2d6;">Time</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e7e2d6;">Hours</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e7e2d6;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#888;">No entries this week.</td></tr>`}</tbody>
      </table>

      <table style="border-collapse:collapse;width:100%;font-size:15px;">
        <tr>
          <td style="padding:6px 0;">Total hours</td>
          <td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;"><strong>${fmtHours(totalHours)}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;">Rate</td>
          <td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">${fmtMoney(body.rate)}/hr</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e7e2d6;"><strong>Total owed</strong></td>
          <td style="padding:8px 0;text-align:right;border-top:1px solid #e7e2d6;font-variant-numeric:tabular-nums;"><strong>${fmtMoney(owed)}</strong></td>
        </tr>
      </table>

      <p style="margin:24px 0 0;color:#666;font-size:13px;">— ${escapeHtml(senderName)}</p>
    </div>
  `;

  const subject = `Hours — week of ${format(parseISO(body.weekStart), "d MMM")} — ${fmtHours(totalHours)} (${fmtMoney(owed)})`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: body.to,
      subject,
      html,
    });
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message });
    }
    return NextResponse.json({ ok: true, via: "email" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, reason: message });
  }
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (e <= s) return 0;
  return (e - s) / 60;
}

function fmtHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(n);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
