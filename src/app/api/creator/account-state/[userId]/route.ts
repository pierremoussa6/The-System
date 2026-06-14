import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { requireCreator } from "../../../../lib/creator-auth";
import { createCompactAppState } from "../../../../state-persistence";
import type { UserRecord } from "../../../../types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  artifact_history_json?: UserRecord["artifactHistory"] | null;
  task_history_json?: UserRecord["taskHistory"] | null;
  app_state_json: UserRecord | null;
  updated_at: string;
};

const CREATOR_ACCOUNT_STATE_SELECT =
  "user_id,total_xp,lifetime_xp,spendable_xp,streak,last_completion_date,strength,vitality,discipline,focus,intelligence,agility,magicResistance:magic_resistance,daily_hp,daily_hp_date,active_effects_json,artifact_history_json,task_history_json,app_state_json,updated_at";

function compactStateForResponse(state: RemoteUserState): RemoteUserState {
  if (!state.app_state_json) return state;

  try {
    return {
      ...state,
      app_state_json: createCompactAppState(state.app_state_json),
    };
  } catch {
    const fallbackState = { ...state.app_state_json };

    delete fallbackState.mediaLibrary;
    delete fallbackState.creatorAuditLog;

    return {
      ...state,
      app_state_json: fallbackState as UserRecord,
    };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireCreator(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client is not configured." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("user_state")
    .select(CREATOR_ACCOUNT_STATE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    state: data ? compactStateForResponse(data as RemoteUserState) : null,
  });
}
