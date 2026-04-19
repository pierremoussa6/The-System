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

export type AppRole = "creator" | "player";

export type AuthProfile = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
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
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getFallbackDisplayName(user: User) {
  return (
    user.user_metadata?.display_name ??
    user.email?.split("@")[0] ??
    "Player"
  );
}

function normalizeProfile(user: User, profile: Partial<AuthProfile> | null): AuthProfile {
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    display_name: profile?.display_name ?? getFallbackDisplayName(user),
    role: profile?.role === "creator" ? "creator" : "player",
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

    const { data, error: selectError } = await supabase
      .from("profiles")
      .select("id,email,display_name,role,timezone,reminders_enabled")
      .eq("id", nextUser.id)
      .maybeSingle();

    if (selectError) {
      setError(selectError.message);
      setProfile(normalizeProfile(nextUser, null));
      return;
    }

    if (data) {
      setProfile(normalizeProfile(nextUser, data as Partial<AuthProfile>));
      return;
    }

    const newProfile = normalizeProfile(nextUser, null);
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select("id,email,display_name,role,timezone,reminders_enabled")
      .single();

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

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      const nextSession = data.session;
      setSession(nextSession);
      await loadProfile(nextSession?.user ?? null);
      setStatus(nextSession ? "authenticated" : "anonymous");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    setError(null);
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
      isCreator: profile?.role === "creator",
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
