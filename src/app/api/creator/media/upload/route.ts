import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { requireCreator } from "../../../../lib/creator-auth";
import type {
  CreatorMediaItem,
  CreatorMediaScope,
  CreatorMediaTargetType,
} from "../../../../types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CREATOR_MEDIA_BUCKET = "creator-media";
const CREATOR_MEDIA_MAX_BYTES = 4_000_000;
const CREATOR_MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/json",
];

type CreatorMediaRow = {
  id: string;
  uploaded_by: string;
  target_type: CreatorMediaTargetType;
  target_id: string;
  scope: CreatorMediaScope;
  user_id: string | null;
  file_url: string;
  file_type: string;
  alt_text: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const targetTypes = new Set<CreatorMediaTargetType>([
  "dashboard_banner",
  "quest_banner",
  "special_quest",
  "fun_activity",
  "artifact_card",
  "artifact_icon",
  "artifact_activation",
  "artifact_reward",
  "artifact_background",
  "workout_banner",
  "workout_phase",
  "exercise_media",
  "diet_banner",
  "meal_suggestion",
  "progress_banner",
  "rank_icon",
  "level_icon",
  "build_icon",
  "system_log_icon",
  "profile_avatar",
  "motivational_media",
]);

function isScope(value: unknown): value is CreatorMediaScope {
  return value === "global" || value === "user" || value === "fallback";
}

function isTargetType(value: unknown): value is CreatorMediaTargetType {
  return typeof value === "string" && targetTypes.has(value as CreatorMediaTargetType);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function formatStorageError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") return message;
  }

  return error instanceof Error ? error.message : "Storage request failed.";
}

function isMissingBucketError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  const status = Number(candidate.status ?? candidate.statusCode);
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return status === 404 || /not found|does not exist/i.test(message);
}

function isAlreadyExistsError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  const status = Number(candidate.status ?? candidate.statusCode);
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return status === 409 || /already exists/i.test(message);
}

function mediaRowToItem(row: CreatorMediaRow): CreatorMediaItem {
  return {
    id: row.id,
    uploadedBy: row.uploaded_by,
    targetType: row.target_type,
    targetId: row.target_id,
    scope: row.scope,
    userId: row.user_id,
    fileUrl: row.file_url,
    fileType: row.file_type,
    altText: row.alt_text,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizePathPart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "default"
  );
}

function extensionFromFile(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]{2,8}$/.test(nameExtension)) {
    return nameExtension;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "application/json") return "json";

  return "bin";
}

async function ensureCreatorMediaBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>
) {
  const { error: getError } = await supabase.storage.getBucket(CREATOR_MEDIA_BUCKET);

  if (!getError) return null;
  if (!isMissingBucketError(getError)) return getError;

  const { error: createError } = await supabase.storage.createBucket(
    CREATOR_MEDIA_BUCKET,
    {
      public: true,
      allowedMimeTypes: CREATOR_MEDIA_ALLOWED_MIME_TYPES,
      fileSizeLimit: CREATOR_MEDIA_MAX_BYTES,
    }
  );

  if (createError && !isAlreadyExistsError(createError)) {
    return createError;
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await requireCreator(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Upload form data is required." }, { status: 400 });
  }

  const scope = getString(formData, "scope");
  const targetType = getString(formData, "targetType");
  const targetId = getString(formData, "targetId") || "default";
  const userId = getString(formData, "userId") || null;
  const title = getString(formData, "title");
  const altText = getString(formData, "altText");
  const file = formData.get("file");

  if (!isScope(scope) || !isTargetType(targetType)) {
    return NextResponse.json(
      { error: "Invalid media target or scope." },
      { status: 400 }
    );
  }

  if (scope === "user" && !userId) {
    return NextResponse.json(
      { error: "Choose a user for user-specific media." },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a media file to upload." }, { status: 400 });
  }

  if (file.size > CREATOR_MEDIA_MAX_BYTES) {
    return NextResponse.json(
      { error: "Media files are capped at 4 MB. Use an optimized image or short animation." },
      { status: 400 }
    );
  }

  if (
    !CREATOR_MEDIA_ALLOWED_MIME_TYPES.includes(file.type)
  ) {
    return NextResponse.json(
      { error: "Only image, video, GIF, and JSON animation files are supported." },
      { status: 400 }
    );
  }

  const bucketError = await ensureCreatorMediaBucket(supabase);

  if (bucketError) {
    return NextResponse.json(
      { error: `Creator media bucket could not be prepared: ${formatStorageError(bucketError)}` },
      { status: 500 }
    );
  }

  const path = [
    sanitizePathPart(targetType),
    sanitizePathPart(targetId),
    `${Date.now()}-${crypto.randomUUID()}.${extensionFromFile(file)}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from(CREATOR_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Media file could not be uploaded: ${formatStorageError(uploadError)}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CREATOR_MEDIA_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("creator_media")
    .insert({
      uploaded_by: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      scope,
      user_id: scope === "user" ? userId : null,
      file_url: publicUrl,
      file_type: file.type || "application/octet-stream",
      alt_text: altText,
      title: title || file.name,
    })
    .select("id,uploaded_by,target_type,target_id,scope,user_id,file_url,file_type,alt_text,title,created_at,updated_at")
    .single();

  if (error) {
    await supabase.storage.from(CREATOR_MEDIA_BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("creator_audit_logs").insert({
    creator_id: auth.user.id,
    affected_user_id: scope === "user" ? userId : null,
    field_changed: `media.${targetType}.${targetId}`,
    old_value: "previous media",
    new_value: title || file.name || targetId,
  });

  return NextResponse.json({
    media: mediaRowToItem(data as CreatorMediaRow),
  });
}
