import type {
  CreatorAuditEntry,
  CreatorMediaItem,
  CreatorMediaScope,
  CreatorMediaTargetType,
} from "./types";

export function createCreatorMediaItem(input: {
  uploadedBy: string;
  targetType: CreatorMediaTargetType;
  targetId: string;
  scope: CreatorMediaScope;
  userId: string | null;
  fileUrl: string;
  fileType: string;
  altText: string;
  title: string;
}): CreatorMediaItem {
  const now = new Date().toISOString();

  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uploadedBy: input.uploadedBy,
    targetType: input.targetType,
    targetId: input.targetId,
    scope: input.scope,
    userId: input.scope === "user" ? input.userId : null,
    fileUrl: input.fileUrl,
    fileType: input.fileType,
    altText: input.altText,
    title: input.title,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCreatorMediaLibrary(
  media: CreatorMediaItem[] | undefined
): CreatorMediaItem[] {
  if (!Array.isArray(media)) return [];

  return media
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const scope: CreatorMediaScope =
        item.scope === "global" || item.scope === "fallback"
          ? item.scope
          : "user";

      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id
            : `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uploadedBy:
          typeof item.uploadedBy === "string" ? item.uploadedBy : "unknown",
        targetType: item.targetType,
        targetId: typeof item.targetId === "string" ? item.targetId : "default",
        scope,
        userId: typeof item.userId === "string" ? item.userId : null,
        fileUrl: typeof item.fileUrl === "string" ? item.fileUrl : "",
        fileType: typeof item.fileType === "string" ? item.fileType : "",
        altText: typeof item.altText === "string" ? item.altText : "",
        title: typeof item.title === "string" ? item.title : "",
        createdAt:
          typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        updatedAt:
          typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
      };
    })
    .filter((item) => item.fileUrl && item.targetType && item.targetId)
    .slice(0, 300);
}

export function getMediaForTarget(
  media: CreatorMediaItem[] | undefined,
  targetType: CreatorMediaTargetType,
  targetId: string,
  userId?: string | null
) {
  const library = normalizeCreatorMediaLibrary(media);
  const matches = library.filter(
    (item) => item.targetType === targetType && item.targetId === targetId
  );

  return (
    matches.find((item) => item.scope === "user" && item.userId === userId) ??
    matches.find((item) => item.scope === "global") ??
    matches.find((item) => item.scope === "fallback") ??
    null
  );
}

export function createCreatorAuditEntry(input: {
  creatorId: string;
  affectedUserId: string | null;
  fieldChanged: string;
  oldValue: unknown;
  newValue: unknown;
}): CreatorAuditEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    creatorId: input.creatorId,
    affectedUserId: input.affectedUserId,
    fieldChanged: input.fieldChanged,
    oldValue: JSON.stringify(input.oldValue),
    newValue: JSON.stringify(input.newValue),
    timestamp: new Date().toISOString(),
  };
}
