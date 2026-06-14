import { getSupabaseServiceClient } from "./supabase/server";

export const PRIMARY_CREATOR_EMAIL = "pierremoussa6@gmail.com";

export type CreatorAuthResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        role: "creator" | "admin";
      };
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      error: string;
    };

type ProfileRole = "creator" | "admin" | "player";

type CreatorProfileRow = {
  id: string;
  email: string;
  role: ProfileRole;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim();
}

export async function requireCreator(request: Request): Promise<CreatorAuthResult> {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return {
      ok: false,
      status: 500,
      error: "Supabase service client is not configured.",
    };
  }

  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing authorization token.",
    };
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      error: "Invalid authorization token.",
    };
  }

  const authUser = userData.user;
  const authEmail = authUser.email?.toLowerCase() ?? "";
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 500,
      error: profileError.message,
    };
  }

  const row = profile as CreatorProfileRow | null;
  const email = (row?.email ?? authEmail).toLowerCase();
  const role =
    email === PRIMARY_CREATOR_EMAIL
      ? "creator"
      : row?.role === "creator" || row?.role === "admin"
      ? row.role
      : null;

  if (!role) {
    return {
      ok: false,
      status: 403,
      error: "Creator access required.",
    };
  }

  return {
    ok: true,
    user: {
      id: authUser.id,
      email,
      role,
    },
  };
}
