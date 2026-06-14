import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";
import { requireCreator } from "../../../lib/creator-auth";
import type { UserRecord } from "../../../types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RemoteProfile = {
  id: string;
  email: string;
  display_name: string;
  role: "creator" | "admin" | "player";
  account_status: "pending_approval" | "approved" | "rejected" | "blocked";
  timezone: string;
  reminders_enabled: boolean;
  created_at: string;
};

type RemoteUserState = {
  user_id: string;
  total_xp: number;
  lifetime_xp?: number;
  spendable_xp?: number;
  streak: number;
  last_completion_date: string | null;
  strength: number;
  vitality: number;
  discipline: number;
  focus: number;
  intelligence: number;
  agility: number;
  magicResistance: number;
  daily_hp: number | null;
  daily_hp_date: string | null;
  active_effects_json?: UserRecord["activeEffects"] | null;
  app_state_json?: null;
  updated_at: string;
};

type AdminNotification = {
  id: string;
  profile_id: string | null;
  notification_type: string;
  title: string;
  details: string;
  read_at: string | null;
  created_at: string;
};

const CREATOR_STATE_SELECT =
  "user_id,total_xp,lifetime_xp,spendable_xp,streak,last_completion_date,strength,vitality,discipline,focus,intelligence,agility,magicResistance:magic_resistance,daily_hp,daily_hp_date,active_effects_json,updated_at";

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

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,account_status,timezone,reminders_enabled,created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileRows = (profiles ?? []) as RemoteProfile[];
  const profileIds = profileRows.map((profile) => profile.id);
  let states: RemoteUserState[] = [];

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("user_state")
      .select(CREATOR_STATE_SELECT)
      .in("user_id", profileIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    states = (data ?? []) as RemoteUserState[];
  }

  const stateByUserId = new Map(
    states.map((state) => [state.user_id, { ...state, app_state_json: null }])
  );

  const { data: notifications } = await supabase
    .from("admin_notifications")
    .select("id,profile_id,notification_type,title,details,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    accounts: profileRows.map((profile) => ({
      ...profile,
      account_status:
        profile.role === "creator"
          ? "approved"
          : profile.account_status ?? "approved",
      state: stateByUserId.get(profile.id) ?? null,
    })),
    notifications: (notifications ?? []) as AdminNotification[],
  });
}
