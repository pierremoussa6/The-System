"use client";

type SectionTitleProps = {
  title: string;
  colorClass?: string;
  subtitle?: string;
};

export default function SectionTitle({
  title,
  colorClass = "text-blue-400",
  subtitle,
}: SectionTitleProps) {
  return (
    <div className="space-y-1">
      <h2 className={`text-xl font-semibold tracking-wide ${colorClass}`}>
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}