import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";
import { requireCreator } from "../../../lib/creator-auth";
import type {
  CreatorMediaItem,
  CreatorMediaScope,
  CreatorMediaTargetType,
} from "../../../types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET(request: Request) {
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

  const { data, error } = await supabase
    .from("creator_media")
    .select("id,uploaded_by,target_type,target_id,scope,user_id,file_url,file_type,alt_text,title,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    media: ((data ?? []) as CreatorMediaRow[]).map(mediaRowToItem),
  });
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

  const body = await request.json().catch(() => null);
  const scope = body?.scope;
  const targetType = body?.targetType;
  const targetId =
    typeof body?.targetId === "string" && body.targetId.trim()
      ? body.targetId.trim()
      : "default";
  const userId =
    typeof body?.userId === "string" && body.userId.trim()
      ? body.userId.trim()
      : null;
  const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : "";
  const fileType = typeof body?.fileType === "string" ? body.fileType : "";
  const title = typeof body?.title === "string" ? body.title : "";
  const altText = typeof body?.altText === "string" ? body.altText : "";

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

  if (!fileUrl || !fileType) {
    return NextResponse.json(
      { error: "Media file data is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("creator_media")
    .insert({
      uploaded_by: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      scope,
      user_id: scope === "user" ? userId : null,
      file_url: fileUrl,
      file_type: fileType,
      alt_text: altText,
      title,
    })
    .select("id,uploaded_by,target_type,target_id,scope,user_id,file_url,file_type,alt_text,title,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("creator_audit_logs").insert({
    creator_id: auth.user.id,
    affected_user_id: scope === "user" ? userId : null,
    field_changed: `media.${targetType}.${targetId}`,
    old_value: "previous media",
    new_value: title || targetId,
  });

  return NextResponse.json({
    media: mediaRowToItem(data as CreatorMediaRow),
  });
}
