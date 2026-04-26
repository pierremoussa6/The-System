"use client";

import Link from "next/link";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";

const steps = [
  {
    title: "1. Complete Profile Setup",
    description:
      "Tell The System why you want to improve, what kind of life pressure you can handle, and which workout days you actually prefer.",
  },
  {
    title: "2. Open Dashboard",
    description:
      "Generate your weekly plan, check today’s HP, and see your current rank, level, active special quest, and system warnings.",
  },
  {
    title: "3. Clear Daily Quests",
    description:
      "Daily quests build consistency. Missing them now hurts discipline and related stats, so your streak and attributes finally reflect reality.",
  },
  {
    title: "4. Use Workout",
    description:
      "Follow the structured multi-month training block, then log exercises, sets, reps, and weights in the workout journal to track progression.",
  },
  {
    title: "5. Review Progress",
    description:
      "Use Progress to see stat trends and overall growth. Rank is now much harder than level and requires real consistency over time.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="mb-3 text-3xl text-blue-400">How The System Works</h1>
        <p className="max-w-3xl text-zinc-400">
          This is the quick start page for new players. Use it when the app feels large or when you want a fast reminder of what each section is for.
        </p>
      </div>

      <PanelCard className="border-blue-500">
        <SectionTitle title="Quick Start" colorClass="text-blue-400" />
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <p className="font-semibold text-white">{step.title}</p>
              <p className="mt-1 text-zinc-300">{step.description}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Page Map" colorClass="text-purple-400" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `Dashboard`: command center for weekly planning, HP, rank, and special quests.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `Quests`: your daily checklist and the core XP engine.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `Workout`: your training program plus the lifting journal.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `Progress`: charts and long-term stat growth.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `Diet`: food direction and nutrition guidance from the current plan.
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            `System Log`: notable actions, penalties, and system decisions.
          </div>
        </div>
      </PanelCard>

      <div className="flex flex-wrap gap-3">
        <Link href="/profile-setup">
          <ActionButton variant="blue">Open Profile Setup</ActionButton>
        </Link>
        <Link href="/dashboard">
          <ActionButton variant="purple">Open Dashboard</ActionButton>
        </Link>
      </div>
    </div>
  );
}
