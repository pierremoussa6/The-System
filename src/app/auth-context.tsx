"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  hasSupabaseConfig,
} from "./lib/supabase/client";
import { safeRemoveStorageItem, safeSetStorageItem } from "./lib/browser-storage";

export type AppRole = "creator" | "admin" | "player";
export type AccountStatus = "pending_approval" | "approved" | "rejected" | "blocked";

export type AuthProfile = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  account_status: AccountStatus;
  timezone: string;
  reminders_enabled: boolean;
};

type AuthStatus = "checking" | "authenticated" | "anonymous" | "unconfigured";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  isCreator: boolean;
  isApproved: boolean;
  error: string | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STARTUP_TIMEOUT_MS = 8000;
const PRIMARY_CREATOR_EMAIL = "pierremoussa6@gmail.com";

function getAuthErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function getFallbackDisplayName(user: User) {
  return (
    user.user_metadata?.display_name ??
    user.email?.split("@")[0] ??
    "Player"
  );
}

function getDefaultAccountStatus(user: User): AccountStatus {
  return user.email?.toLowerCase() === PRIMARY_CREATOR_EMAIL
    ? "approved"
    : "pending_approval";
}

function normalizeProfile(user: User, profile: Partial<AuthProfile> | null): AuthProfile {
  const email = profile?.email ?? user.email ?? "";
  const isPrimaryCreator = email.toLowerCase() === PRIMARY_CREATOR_EMAIL;
  const role =
    isPrimaryCreator
      ? "creator"
      : profile?.role === "creator" || profile?.role === "admin"
      ? profile.role
      : "player";

  return {
    id: user.id,
    email,
    display_name: profile?.display_name ?? getFallbackDisplayName(user),
    role,
    account_status:
      role === "creator" || role === "admin"
        ? "approved"
        : profile?.account_status === "pending_approval" ||
          profile?.account_status === "rejected" ||
          profile?.account_status === "blocked" ||
          profile?.account_status === "approved"
        ? profile.account_status
        : "approved",
    timezone: profile?.timezone ?? "Europe/Stockholm",
    reminders_enabled: profile?.reminders_enabled ?? true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasSupabaseConfig() ? "checking" : "unconfigured"
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (nextUser: User | null) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !nextUser) {
      setProfile(null);
      return;
    }

    const profileQuery = await supabase
      .from("profiles")
      .select("id,email,display_name,role,account_status,timezone,reminders_enabled")
      .eq("id", nextUser.id)
      .maybeSingle();
    let data = profileQuery.data as Partial<AuthProfile> | null;
    let selectError = profileQuery.error;

    if (selectError && selectError.code === "42703") {
      const fallback = await supabase
        .from("profiles")
        .select("id,email,display_name,role,timezone,reminders_enabled")
        .eq("id", nextUser.id)
        .maybeSingle();

      data = fallback.data as Partial<AuthProfile> | null;
      selectError = fallback.error;
    }

    if (selectError) {
      setError(selectError.message);
      setProfile(normalizeProfile(nextUser, null));
      return;
    }

    if (data) {
      setProfile(normalizeProfile(nextUser, data as Partial<AuthProfile>));
      return;
    }

    const newProfile: AuthProfile = {
      ...normalizeProfile(nextUser, null),
      account_status: getDefaultAccountStatus(nextUser),
    };
    const insertQuery = await supabase
      .from("profiles")
      .insert(newProfile)
      .select("id,email,display_name,role,account_status,timezone,reminders_enabled")
      .single();
    let inserted = insertQuery.data as Partial<AuthProfile> | null;
    let insertError = insertQuery.error;

    if (insertError && insertError.code === "42703") {
      const legacyProfile = {
        id: newProfile.id,
        email: newProfile.email,
        display_name: newProfile.display_name,
        role: newProfile.role,
        timezone: newProfile.timezone,
        reminders_enabled: newProfile.reminders_enabled,
      };
      const fallback = await supabase
        .from("profiles")
        .insert(legacyProfile)
        .select("id,email,display_name,role,timezone,reminders_enabled")
        .single();

      inserted = fallback.data as Partial<AuthProfile> | null;
      insertError = fallback.error;
    }

    if (insertError) {
      setError(insertError.message);
      setProfile(newProfile);
      return;
    }

    setProfile(normalizeProfile(nextUser, inserted as Partial<AuthProfile>));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function initializeSession() {
      try {
        const { data, error: sessionError } = await withTimeout(
          supabaseClient.auth.getSession(),
          AUTH_STARTUP_TIMEOUT_MS,
          "Timed out while checking your saved session."
        );

        if (!isMounted) return;

        if (sessionError) {
          setError(sessionError.message);
        }

        const nextSession = data.session;
        setSession(nextSession);

        if (!nextSession) {
          setProfile(null);
          setStatus("anonymous");
          return;
        }

        setProfile(normalizeProfile(nextSession.user, null));
        setStatus("authenticated");

        try {
          await withTimeout(
            loadProfile(nextSession.user),
            AUTH_STARTUP_TIMEOUT_MS,
            "Timed out while loading your profile."
          );
        } catch (profileError) {
          if (!isMounted) return;
          setError(
            getAuthErrorMessage(
              profileError,
              "The System could not load your profile."
            )
          );
        }
      } catch (sessionError) {
        if (!isMounted) return;

        setError(
          getAuthErrorMessage(
            sessionError,
            "The System could not check your saved session."
          )
        );
        setSession(null);
        setProfile(null);
        setStatus("anonymous");
      }
    }

    void initializeSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string, rememberMe = true) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    setError(null);
    if (typeof window !== "undefined") {
      const storagePreference = rememberMe ? "local" : "session";

      if (
        !safeSetStorageItem(
          "local",
          "the-system-auth-persistence",
          storagePreference
        )
      ) {
        safeSetStorageItem(
          "session",
          "the-system-auth-persistence",
          storagePreference
        );
      }
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        throw signUpError;
      }

      if (data.user && data.session) {
        await loadProfile(data.user);
      }

      return data.session ? null : "Check your inbox to confirm your email.";
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }

    setSession(null);
    setProfile(null);
    setStatus("anonymous");
    if (typeof window !== "undefined") {
      safeRemoveStorageItem("local", "the-system-auth-persistence");
      safeRemoveStorageItem("session", "the-system-auth-persistence");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      profile,
      isCreator: profile?.role === "creator" || profile?.role === "admin",
      isApproved:
        status === "unconfigured" ||
        profile?.role === "creator" ||
        profile?.role === "admin" ||
        profile?.account_status === "approved",
      error,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [error, profile, refreshProfile, session, signIn, signOut, signUp, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
