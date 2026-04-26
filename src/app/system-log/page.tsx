"use client";

import { useMemo } from "react";
import { useApp } from "../store";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import type { LogEntryType } from "../types";

export default function SystemLogPage() {
  const { isLoaded, log } = useApp();

  const grouped = useMemo(() => {
    return {
      mission: log.filter(
        (entry) =>
          entry.type === "daily_quest" ||
          entry.type === "special_quest" ||
          entry.type === "workout_log" ||
          entry.type === "special_status"
      ),
      system: log.filter(
        (entry) =>
          entry.type === "system_analysis" ||
          entry.type === "weekly_plan" ||
          entry.type === "system_rotation" ||
          entry.type === "system_notice"
      ),
      penalty: log.filter((entry) => entry.type === "penalty"),
    };
  }, [log]);

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

  function renderEntries(title: string, colorClass: string, entries: typeof log) {
    return (
      <PanelCard className={colorClass}>
        <SectionTitle title={title} colorClass={colorClass.replace("border-", "text-")} />
        {entries.length === 0 ? (
          <p className="text-zinc-400">No entries in this category yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
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
          </div>
        )}
      </PanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">System Log</h1>

      {log.length === 0 ? (
        <PanelCard>
          <p>No log entries yet.</p>
        </PanelCard>
      ) : (
        <>
          {renderEntries("System Decisions", "border-sky-500", grouped.system)}
          {renderEntries("Mission Activity", "border-purple-500", grouped.mission)}
          {renderEntries("Penalty Records", "border-red-500", grouped.penalty)}
        </>
      )}
    </div>
  );
}
