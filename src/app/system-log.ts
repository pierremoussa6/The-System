import type { LogEntry } from "./types";

export function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export function getTimestampString() {
  return new Date().toLocaleString();
}

export function appendLog(
  currentLog: LogEntry[],
  entry: Omit<LogEntry, "id" | "date">
): LogEntry[] {
  const newEntry: LogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: getTimestampString(),
  };

  return [newEntry, ...currentLog].slice(0, 150);
}
