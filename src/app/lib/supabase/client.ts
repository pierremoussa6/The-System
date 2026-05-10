"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const persistenceKey = "the-system-auth-persistence";

function getAuthStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    get length() {
      return window.localStorage.length + window.sessionStorage.length;
    },
    clear() {
      window.localStorage.clear();
      window.sessionStorage.clear();
    },
    key(index: number) {
      return window.localStorage.key(index) ?? window.sessionStorage.key(index);
    },
    getItem(key: string) {
      return (
        window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
      );
    },
    setItem(key: string, value: string) {
      const target =
        window.localStorage.getItem(persistenceKey) === "session"
          ? window.sessionStorage
          : window.localStorage;
      const other =
        target === window.localStorage
          ? window.sessionStorage
          : window.localStorage;

      other.removeItem(key);
      target.setItem(key, value);
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getSupabasePublicKey()!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: getAuthStorage(),
        },
      }
    );
  }

  return browserClient;
}
