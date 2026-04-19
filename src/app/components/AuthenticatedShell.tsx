"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppProvider } from "../store";
import { useAuth } from "../auth-context";
import SidebarNav from "./SidebarNav";
import PanelCard from "./PanelCard";

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen bg-black text-white md:flex">
        <SidebarNav />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AppProvider>
  );
}

function LocalModeBanner() {
  return (
    <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
      Supabase is not configured yet. The System is running in local prototype
      mode on this browser.
    </div>
  );
}

function LoadingGate() {
  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      <div className="mx-auto max-w-xl">
        <PanelCard className="border-blue-500">
          <p>Checking system access...</p>
        </PanelCard>
      </div>
    </main>
  );
}

export default function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  useEffect(() => {
    if (status !== "anonymous" || isAuthRoute) return;

    const next = `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    router.replace(`/auth?next=${encodeURIComponent(next)}`);
  }, [isAuthRoute, pathname, router, searchParams, status]);

  useEffect(() => {
    if (status !== "authenticated" || !isAuthRoute) return;

    const next = searchParams.get("next");
    router.replace(next || "/");
  }, [isAuthRoute, router, searchParams, status]);

  if (isAuthRoute) {
    return (
      <main className="min-h-screen bg-black p-4 text-white md:p-8">
        {children}
      </main>
    );
  }

  if (status === "unconfigured") {
    return (
      <AppFrame>
        <LocalModeBanner />
        {children}
      </AppFrame>
    );
  }

  if (status === "checking" || status === "anonymous") {
    return <LoadingGate />;
  }

  return <AppFrame>{children}</AppFrame>;
}
