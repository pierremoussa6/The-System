"use client";

import React from "react";

type ActionButtonVariant =
  | "blue"
  | "purple"
  | "red"
  | "green"
  | "gray";

type ActionButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ActionButtonVariant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
};

function getVariantClasses(variant: ActionButtonVariant, disabled: boolean) {
  if (disabled) {
    return "border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-70";
  }

  switch (variant) {
    case "blue":
      return "border-blue-500/60 bg-blue-500/15 text-blue-200 hover:border-blue-400 hover:bg-blue-500/20 hover:text-blue-100";
    case "purple":
      return "border-purple-500/60 bg-purple-500/15 text-purple-200 hover:border-purple-400 hover:bg-purple-500/20 hover:text-purple-100";
    case "red":
      return "border-red-500/60 bg-red-500/15 text-red-200 hover:border-red-400 hover:bg-red-500/20 hover:text-red-100";
    case "green":
      return "border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100";
    case "gray":
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white";
  }
}

export default function ActionButton({
  children,
  onClick,
  variant = "gray",
  disabled = false,
  className = "",
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold",
        "shadow-sm transition duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
        "active:scale-[0.98]",
        getVariantClasses(variant, disabled),
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}