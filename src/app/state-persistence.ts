import type { UserRecord } from "./types";

export function createCompactAppState(user: UserRecord): UserRecord {
  const compact = { ...user };

  delete compact.mediaLibrary;
  delete compact.creatorAuditLog;

  return compact;
}
