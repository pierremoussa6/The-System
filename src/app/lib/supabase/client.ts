"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  safeClearStorage,
  safeGetStorageItem,
  safeRemoveStorageItem,
  safeSetStorageItem,
  safeStorageKey,
  safeStorageLength,
} from "../browser-storage";

let browserClient: SupabaseClient | null = null;

const persistenceKey = "the-system-auth-persistence";

function getPreferredAuthStorageArea() {
  const preference =
    safeGetStorageItem("local", persistenceKey) ??
    safeGetStorageItem("session", persistenceKey);

  return preference === "session" ? "session" : "local";
}

function getAuthStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    get length() {
      return safeStorageLength("local") + safeStorageLength("session");
    },
    clear() {
      safeClearStorage("local");
      safeClearStorage("session");
    },
    key(index: number) {
      return safeStorageKey("local", index) ?? safeStorageKey("session", index);
    },
    getItem(key: string) {
      return (
        safeGetStorageItem("local", key) ?? safeGetStorageItem("session", key)
      );
    },
    setItem(key: string, value: string) {
      const target = getPreferredAuthStorageArea();
      const other = target === "local" ? "session" : "local";

      safeRemoveStorageItem(other, key);

      if (!safeSetStorageItem(target, key, value)) {
        safeSetStorageItem(other, key, value);
      }
    },
    removeItem(key: string) {
      safeRemoveStorageItem("local", key);
      safeRemoveStorageItem("session", key);
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
