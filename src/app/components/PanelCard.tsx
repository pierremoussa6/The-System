"use client";

import React from "react";

type PanelCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function PanelCard({
  children,
  className = "",
}: PanelCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_30px_rgba(0,0,0,0.35)]",
        "transition duration-200",
        className,
      ].join(" ")}
    >
      <div className="space-y-4">{children}</div>
    </div>
  );
}