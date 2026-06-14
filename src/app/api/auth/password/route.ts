import type { Session } from "@supabase/supabase-js";
import { withTimeout } from "../../../lib/async-timeout";

const AUTH_REQUEST_TIMEOUT_MS = 10000;

type PasswordAuthRequest = {
  email?: unknown;
  password?: unknown;
};

type SupabasePasswordAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: Session["user"];
  message?: string;
  msg?: string;
  error?: string;
  error_description?: string;
};

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseProjectRef(supabaseUrl: string) {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "configured";
  } catch {
    return "configured";
  }
}

function getPayloadMessage(payload: SupabasePasswordAuthResponse | null) {
  return (
    payload?.message ??
    payload?.msg ??
    payload?.error_description ??
    payload?.error ??
    null
  );
}

function serviceUnavailableMessage(projectRef: string) {
  return `Supabase auth is not responding for project ${projectRef}. Check that the Supabase project is active, then try again.`;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readJsonResponse(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SupabasePasswordAuthResponse;
  } catch {
    return { message: raw };
  }
}

export async function POST(request: Request) {
  let body: PasswordAuthRequest;

  try {
    body = (await request.json()) as PasswordAuthRequest;
  } catch {
    return jsonError("The login request was not valid JSON.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonError("Email and password are required.", 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey = getSupabasePublicKey();

  if (!supabaseUrl || !supabasePublicKey) {
    return jsonError("Supabase is not configured for this deployment.", 503);
  }

  const projectRef = getSupabaseProjectRef(supabaseUrl);
  const endpoint = `${supabaseUrl.replace(
    /\/+$/,
    ""
  )}/auth/v1/token?grant_type=password`;

  let authResponse: Response;

  try {
    authResponse = await withTimeout(
      fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: supabasePublicKey,
          Authorization: `Bearer ${supabasePublicKey}`,
          "Content-Type": "application/json;charset=UTF-8",
          "X-Client-Info": "the-system-server-auth/1.0",
          "X-Supabase-Api-Version": "2024-01-01",
        },
        body: JSON.stringify({
          email,
          password,
          gotrue_meta_security: {},
        }),
        cache: "no-store",
      }),
      AUTH_REQUEST_TIMEOUT_MS,
      "Supabase auth timed out."
    );
  } catch (error) {
    console.error("[api/auth/password] Supabase auth request failed", {
      projectRef,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError(serviceUnavailableMessage(projectRef), 503);
  }

  const payload = await readJsonResponse(authResponse);

  if (!authResponse.ok) {
    const status = authResponse.status >= 500 ? 503 : authResponse.status;
    const message =
      authResponse.status >= 500
        ? serviceUnavailableMessage(projectRef)
        : getPayloadMessage(payload) ?? "Supabase rejected the login request.";

    console.warn("[api/auth/password] Supabase auth rejected request", {
      projectRef,
      status: authResponse.status,
    });

    return jsonError(message, status);
  }

  if (
    !payload?.access_token ||
    !payload.refresh_token ||
    !payload.user ||
    !payload.expires_in ||
    payload.token_type !== "bearer"
  ) {
    console.error("[api/auth/password] Supabase auth response was incomplete", {
      projectRef,
    });

    return jsonError("Supabase returned an incomplete login session.", 502);
  }

  const session: Session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at,
    token_type: "bearer",
    user: payload.user,
  };

  return Response.json({ session });
}
