"use client";

type StatCardProps = {
  label: string;
  value: number | string;
  helperText?: string;
};

function getStatAccent(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("strength")) {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (lower.includes("vitality")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (lower.includes("discipline")) {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (lower.includes("focus")) {
    return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-200";
}

export default function StatCard({
  label,
  value,
  helperText,
}: StatCardProps) {
  const accent = getStatAccent(label);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_10px_25px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {helperText ? (
            <p className="mt-2 text-sm text-zinc-500">{helperText}</p>
          ) : null}
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${accent}`}
        >
          Stat
        </div>
      </div>
    </div>
  );
}