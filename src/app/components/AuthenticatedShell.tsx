"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppProvider } from "../store";
import { useApp } from "../store";
import { useAuth } from "../auth-context";
import SidebarNav from "./SidebarNav";
import PanelCard from "./PanelCard";
import ActionButton from "./ActionButton";
import { isProfileComplete } from "../profile";

function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, profile } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const isProfileRoute = pathname === "/profile-setup";
  const isInfoRoute = pathname === "/onboarding";
  const complete = isProfileComplete(profile);

  useEffect(() => {
    if (!isLoaded || complete || isProfileRoute || isInfoRoute) return;
    router.replace("/profile-setup");
  }, [complete, isInfoRoute, isLoaded, isProfileRoute, router]);

  if (isLoaded && !complete && !isProfileRoute && !isInfoRoute) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="border-cyan-500">
          <p>System initiation required. Opening the survey...</p>
        </PanelCard>
      </div>
    );
  }

  return <>{children}</>;
}

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen bg-black text-white md:flex">
        <SidebarNav />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
            <ProfileCompletionGate>{children}</ProfileCompletionGate>
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
  const { status, profile, isApproved, signOut } = useAuth();
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

  if (status === "authenticated" && !isApproved) {
    const rejected = profile?.account_status === "rejected";

    return (
      <main className="min-h-screen bg-black p-4 text-white md:p-8">
        <div className="mx-auto max-w-xl">
          <PanelCard className={rejected ? "border-red-500" : "border-yellow-500"}>
            <h1 className="text-2xl text-white">
              {rejected ? "Access Not Approved" : "Approval Pending"}
            </h1>
            <p className="text-zinc-300">
              {rejected
                ? "This account is not active. Contact the System Creator if this is unexpected."
                : "Your account was created and is waiting for creator approval. The full app unlocks after approval."}
            </p>
            <ActionButton onClick={signOut} variant="gray">
              Sign Out
            </ActionButton>
          </PanelCard>
        </div>
      </main>
    );
  }

  return <AppFrame>{children}</AppFrame>;
}
