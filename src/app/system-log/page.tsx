"use client";

import { useMemo, useState } from "react";
import { useApp } from "../store";
import { getActiveArtifactEffects, getWorldChallengeSummary } from "../artifacts";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import type { LogEntryType } from "../types";

export default function SystemLogPage() {
  const { isLoaded, log, activeEffects } = useApp();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    return {
      mission: log.filter(
        (entry) =>
          entry.type === "daily_quest" ||
          entry.type === "special_quest" ||
          entry.type === "workout_log" ||
          entry.type === "special_status" ||
          entry.type === "household_task" ||
          entry.type === "nutrition"
      ),
      system: log.filter(
        (entry) =>
          entry.type === "system_analysis" ||
          entry.type === "weekly_plan" ||
          entry.type === "system_rotation" ||
          entry.type === "system_notice" ||
          entry.type === "artifact"
      ),
      penalty: log.filter((entry) => entry.type === "penalty"),
    };
  }, [log]);
  const worldEffect = getActiveArtifactEffects(activeEffects).find(
    (effect) => effect.artifactId === "world_completion"
  );
  const worldSummary = worldEffect ? getWorldChallengeSummary(worldEffect) : null;

  if (!isLoaded) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">System Log</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  function getTypeColor(type: LogEntryType) {
    switch (type) {
      case "daily_quest":
        return "border-blue-500";
      case "special_quest":
        return "border-purple-500";
      case "workout_log":
        return "border-emerald-500";
      case "household_task":
        return "border-emerald-500";
      case "nutrition":
        return "border-lime-500";
      case "artifact":
        return "border-yellow-500";
      case "special_status":
        return "border-fuchsia-500";
      case "penalty":
        return "border-red-500";
      case "system_analysis":
        return "border-sky-500";
      case "weekly_plan":
        return "border-indigo-500";
      case "system_rotation":
        return "border-cyan-500";
      case "system_notice":
        return "border-yellow-500";
      default:
        return "border-zinc-700";
    }
  }

  function getTypeLabel(type: LogEntryType) {
    switch (type) {
      case "daily_quest":
        return "Daily Quest";
      case "special_quest":
        return "Special Quest";
      case "workout_log":
        return "Workout Log";
      case "household_task":
        return "Task Journal";
      case "nutrition":
        return "Nutrition";
      case "artifact":
        return "Artifact";
      case "special_status":
        return "Quest State";
      case "penalty":
        return "Penalty";
      case "system_analysis":
        return "System Analysis";
      case "weekly_plan":
        return "Weekly Protocol";
      case "system_rotation":
        return "Mission Rotation";
      case "system_notice":
        return "System Notice";
      default:
        return "Event";
    }
  }

  function renderEntries(
    key: string,
    title: string,
    colorClass: string,
    entries: typeof log,
    defaultLimit = 5
  ) {
    const expanded = Boolean(expandedGroups[key]);
    const visibleEntries = expanded ? entries : entries.slice(0, defaultLimit);

    return (
      <PanelCard className={colorClass}>
        <SectionTitle title={title} colorClass={colorClass.replace("border-", "text-")} />
        {entries.length === 0 ? (
          <p className="text-zinc-400">No entries in this category yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleEntries.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl border bg-zinc-900 p-5 ${getTypeColor(
                  entry.type
                )}`}
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className="text-sm text-zinc-400">{getTypeLabel(entry.type)}</p>
                  <p className="text-sm text-zinc-500">{entry.date}</p>
                </div>

                <h2 className="text-lg text-white">{entry.title}</h2>
                <p className="mt-1 text-zinc-300">{entry.details}</p>
              </div>
            ))}
            {entries.length > defaultLimit && (
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups((current) => ({
                    ...current,
                    [key]: !expanded,
                  }))
                }
                className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-blue-400"
              >
                {expanded ? "Show less" : `Show all ${entries.length} entries`}
              </button>
            )}
          </div>
        )}
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">System Log</h1>

      {worldSummary && (
        <PanelCard className="border-emerald-500">
          <SectionTitle
            title="The World's Completion"
            colorClass="text-emerald-400"
            subtitle="Persistent active artifact state."
          />
          <div className="h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full rounded bg-emerald-400"
              style={{
                width: `${Math.round(
                  (worldSummary.currentProgress / worldSummary.requiredProgress) * 100
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-emerald-200">
            {worldSummary.currentProgress}/{worldSummary.requiredProgress} streak days counted
          </p>
        </PanelCard>
      )}

      {log.length === 0 ? (
        <PanelCard>
          <p>No log entries yet.</p>
        </PanelCard>
      ) : (
        <>
          {renderEntries("system", "System Decisions", "border-sky-500", grouped.system)}
          {renderEntries("mission", "Mission Activity", "border-purple-500", grouped.mission)}
          {renderEntries("penalty", "Penalty Records", "border-red-500", grouped.penalty)}
        </>
      )}
    </div>
  );
}
