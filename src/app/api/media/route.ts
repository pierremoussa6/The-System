import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import type {
  CreatorMediaItem,
  CreatorMediaScope,
  CreatorMediaTargetType,
} from "../../types";

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

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim();
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
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ media: [] });
  }

  const token = getBearerToken(request);
  let userId: string | null = null;

  if (token) {
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  let query = supabase
    .from("creator_media")
    .select("id,uploaded_by,target_type,target_id,scope,user_id,file_url,file_type,alt_text,title,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  query = userId
    ? query.or(`scope.in.(global,fallback),user_id.eq.${userId}`)
    : query.in("scope", ["global", "fallback"]);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ media: [] });
  }

  return NextResponse.json({
    media: ((data ?? []) as CreatorMediaRow[]).map(mediaRowToItem),
  });
}
