"use client";

import { useMemo } from "react";
import { useApp } from "../store";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import { calculateLevel, getBuildFromStats } from "../logic";
import { getSystemRank, getRankLabel } from "../rank-system";
import type { HistoryEntry, Stats } from "../types";

type StatKey =
  | "strength"
  | "vitality"
  | "discipline"
  | "intelligence"
  | "agility"
  | "magicResistance";

const chartFillStyle = { width: "100%", height: "100%" };
const statKeys: StatKey[] = [
  "strength",
  "vitality",
  "discipline",
  "intelligence",
  "agility",
  "magicResistance",
];

function formatShortDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatLongDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRadarStatAccentClasses() {
  return "border-purple-500/40 bg-purple-500/10 text-purple-200";
}

function createCurrentHistoryEntry(stats: Stats): HistoryEntry {
  return {
    date: new Date().toISOString().split("T")[0],
    strength: stats.strength,
    vitality: stats.vitality,
    discipline: stats.discipline,
    intelligence: stats.intelligence,
    agility: stats.agility,
    magicResistance: stats.magicResistance,
  };
}

function hasMatchingStats(entry: HistoryEntry | undefined, stats: Stats) {
  return Boolean(
    entry && statKeys.every((stat) => entry[stat] === stats[stat])
  );
}

function getDisplayHistory(history: HistoryEntry[], stats: Stats) {
  const normalizedHistory = history.map((entry) => {
    const legacyEntry = entry as HistoryEntry & { focus?: number };

    return {
      ...entry,
      intelligence: entry.intelligence ?? legacyEntry.focus ?? 0,
      agility: entry.agility ?? 0,
      magicResistance: entry.magicResistance ?? 0,
    };
  });
  const currentEntry = createCurrentHistoryEntry(stats);
  const lastEntry = normalizedHistory[normalizedHistory.length - 1];

  if (hasMatchingStats(lastEntry, stats)) {
    return normalizedHistory;
  }

  if (lastEntry?.date === currentEntry.date) {
    return [...normalizedHistory.slice(0, -1), currentEntry];
  }

  return [...normalizedHistory, currentEntry];
}

function getRadarMax(stats: Stats) {
  const maxStat = Math.max(...statKeys.map((stat) => stats[stat]));

  if (maxStat <= 10) return 10;
  if (maxStat <= 30) return Math.ceil(maxStat / 5) * 5;
  return Math.ceil(maxStat / 10) * 10;
}

function getRadarTicks(radarMax: number) {
  const step = radarMax <= 10 ? 2 : radarMax <= 30 ? 5 : 10;
  const ticks: number[] = [];

  for (let tick = 0; tick <= radarMax; tick += step) {
    ticks.push(tick);
  }

  if (ticks[ticks.length - 1] !== radarMax) {
    ticks.push(radarMax);
  }

  return ticks;
}

export default function ProgressPage() {
  const { isLoaded, stats, totalXp, streak, history } = useApp();

  const build = getBuildFromStats(stats);
  const { level } = calculateLevel(totalXp);
  const rank = getSystemRank(totalXp, stats);
  const rankLabel = getRankLabel(rank);

  const displayHistory = useMemo(
    () => getDisplayHistory(history, stats),
    [history, stats]
  );

  const latest = displayHistory[displayHistory.length - 1];
  const previous = displayHistory[displayHistory.length - 2];

  function getChange(stat: StatKey) {
    if (!latest || !previous) return 0;
    return latest[stat] - previous[stat];
  }

  const radarData = useMemo(
    () => [
      { stat: "Strength", value: stats.strength },
      { stat: "Vitality", value: stats.vitality },
      { stat: "Discipline", value: stats.discipline },
      { stat: "Intelligence", value: stats.intelligence },
      { stat: "Agility", value: stats.agility },
      { stat: "Magic Resistance", value: stats.magicResistance },
    ],
    [stats]
  );

  const radarMax = getRadarMax(stats);
  const radarTicks = getRadarTicks(radarMax);

  const lineData = useMemo(() => {
    return displayHistory.map((entry) => ({
      date: formatShortDate(entry.date),
      fullDate: formatLongDate(entry.date),
      strength: entry.strength,
      vitality: entry.vitality,
      discipline: entry.discipline,
      intelligence: entry.intelligence,
      agility: entry.agility,
      magicResistance: entry.magicResistance,
    }));
  }, [displayHistory]);

  const hasEnoughHistory = displayHistory.length >= 2;

  if (!isLoaded) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Progress</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Progress</h1>

      <PanelCard className="border-blue-500">
        <SectionTitle
          title="Progression Summary"
          colorClass="text-blue-400"
          subtitle="Live overview of your current hunter progression."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm uppercase tracking-wide text-zinc-400">Level</p>
            <p className="mt-2 text-2xl font-semibold text-white">{level}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm uppercase tracking-wide text-zinc-400">Rank</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {rank} · {rankLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm uppercase tracking-wide text-zinc-400">Build</p>
            <p className="mt-2 text-2xl font-semibold text-white">{build}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm uppercase tracking-wide text-zinc-400">Streak</p>
            <p className="mt-2 text-2xl font-semibold text-orange-400">
              🔥 {streak} day(s)
            </p>
          </div>
        </div>
      </PanelCard>

      <PanelCard className="border-cyan-500">
        <SectionTitle
          title="Recent Stat Change"
          colorClass="text-cyan-400"
          subtitle="Difference between your latest two recorded snapshots."
        />

        {hasEnoughHistory ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Strength
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("strength") >= 0 ? "+" : ""}
                {getChange("strength")}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Vitality
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("vitality") >= 0 ? "+" : ""}
                {getChange("vitality")}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Discipline
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("discipline") >= 0 ? "+" : ""}
                {getChange("discipline")}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Intelligence
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("intelligence") >= 0 ? "+" : ""}
                {getChange("intelligence")}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Agility
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("agility") >= 0 ? "+" : ""}
                {getChange("agility")}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm uppercase tracking-wide text-zinc-400">
                Magic Resistance
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {getChange("magicResistance") >= 0 ? "+" : ""}
                {getChange("magicResistance")}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-300">
              Not enough history yet. Complete more quests to build meaningful
              progress comparison.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle
          title="System Attributes Radar"
          colorClass="text-purple-400"
          subtitle="A cleaner visual balance of your four core stats."
        />

        <div className="mx-auto w-full max-w-3xl">
          <div className="h-130 min-w-0 w-full">
            <RadarChart
              responsive
              data={radarData}
              cx="50%"
              cy="50%"
              outerRadius="76%"
              style={chartFillStyle}
            >
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fill: "#e4e4e7", fontSize: 14 }}
              />
              <PolarRadiusAxis
                domain={[0, radarMax]}
                ticks={radarTicks}
                angle={90}
                tick={{ fill: "#d4d4d8", fontSize: 12 }}
                axisLine={{ stroke: "#52525b" }}
                tickLine={false}
              />
              <Radar
                name="Attributes"
                dataKey="value"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.28}
                strokeWidth={2.5}
              />
              <Tooltip
                labelStyle={{ color: "#e9d5ff" }}
                contentStyle={{
                  backgroundColor: "#09090b",
                  border: "1px solid #a855f7",
                  borderRadius: "14px",
                  color: "#fff",
                }}
              />
            </RadarChart>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {radarData.map((item) => (
              <div
                key={item.stat}
                className={`rounded-xl border px-4 py-3 ${getRadarStatAccentClasses()}`}
              >
                <p className="text-xs uppercase tracking-wide opacity-80">
                  {item.stat}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {item.value} / {radarMax}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PanelCard>

      <PanelCard className="border-emerald-500">
        <SectionTitle
          title="Stat Growth Timeline"
          colorClass="text-emerald-400"
          subtitle="Your progression history now uses real dates on the x-axis."
        />

        <div className="h-95 min-w-0 w-full">
          <LineChart
            responsive
            data={lineData}
            margin={{ top: 20, right: 24, left: 4, bottom: 12 }}
            style={chartFillStyle}
          >
            <CartesianGrid stroke="#27272a" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#d4d4d8", fontSize: 12 }}
              axisLine={{ stroke: "#52525b" }}
              tickLine={{ stroke: "#52525b" }}
            />
            <YAxis
              tick={{ fill: "#d4d4d8", fontSize: 12 }}
              axisLine={{ stroke: "#52525b" }}
              tickLine={{ stroke: "#52525b" }}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullDate ?? ""
              }
              contentStyle={{
                backgroundColor: "#09090b",
                border: "1px solid #52525b",
                borderRadius: "14px",
                color: "#fff",
              }}
              labelStyle={{ color: "#93c5fd" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="strength"
              name="Strength"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="vitality"
              name="Vitality"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="discipline"
              name="Discipline"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="intelligence"
              name="Intelligence"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="agility"
              name="Agility"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="magicResistance"
              name="Magic Resistance"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </div>
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Strength" value={stats.strength} />
        <StatCard label="Vitality" value={stats.vitality} />
        <StatCard label="Discipline" value={stats.discipline} />
        <StatCard label="Intelligence" value={stats.intelligence} />
        <StatCard label="Agility" value={stats.agility} />
        <StatCard label="Magic Resistance" value={stats.magicResistance} />
      </div>
    </div>
  );
}

