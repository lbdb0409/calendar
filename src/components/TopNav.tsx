"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/me", label: "Log" },
  { href: "/me/schedule", label: "Schedule" },
  { href: "/me/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex items-center gap-1 rounded-xl border border-[color:var(--color-line)] bg-white p-1 text-sm">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-lg px-3 py-2 text-center transition ${
              active
                ? "bg-[color:var(--color-ink)] text-[#fff7e8] font-medium"
                : "text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-bg)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
