"use client";

import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
