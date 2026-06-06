"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  rightSlot?: ReactNode;
};

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = "",
  headerClassName = "",
  rightSlot,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 text-left ${headerClassName}`}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="flex items-center gap-2 text-sm text-zinc-400">
          {rightSlot}
          <span aria-hidden>{open ? "-" : "+"}</span>
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
