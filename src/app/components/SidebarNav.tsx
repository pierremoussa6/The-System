"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../auth-context";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quests", label: "Quests" },
  { href: "/artifacts", label: "Artifacts" },
  { href: "/workout", label: "Workout" },
  { href: "/diet", label: "Diet" },
  { href: "/progress", label: "Progress" },
  { href: "/system-log", label: "System Log" },
  { href: "/profile-setup", label: "Profile Setup" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/users", label: "Users", creatorOnly: true },
];

function getNavItemClasses(isActive: boolean) {
  return [
    "block rounded-xl border px-4 py-3 text-sm font-medium transition",
    "hover:border-blue-400 hover:bg-zinc-800 hover:text-blue-300",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
    isActive
      ? "border-blue-500 bg-blue-500/10 text-blue-300 shadow-sm"
      : "border-zinc-800 bg-zinc-900 text-zinc-300",
  ].join(" ");
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { isCreator, status } = useAuth();

  return (
    <nav className="flex flex-col gap-3">
      {navItems.map((item) => {
        if (item.creatorOnly && status !== "unconfigured" && !isCreator) {
          return null;
        }

        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={getNavItemClasses(isActive)}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SidebarNav() {
  const pathname = usePathname();
  const { profile, status, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-black/90 px-4 py-4 backdrop-blur md:hidden">
        <Link
          href="/"
          className="text-xl font-bold tracking-wide text-blue-400 transition hover:text-blue-300"
        >
          The System
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-blue-400 hover:text-blue-300"
        >
          Menu
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="text-2xl font-bold tracking-wide text-blue-400 transition hover:text-blue-300"
                onClick={() => setMobileOpen(false)}
              >
                The System
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-red-400 hover:text-red-300"
              >
                Close
              </button>
            </div>

            <p className="mb-5 text-sm text-zinc-400">
              Enter the command interface.
            </p>

            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />

            {status === "authenticated" && (
              <button
                type="button"
                className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            )}
          </aside>
        </div>
      )}

      <aside className="hidden min-h-screen w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 px-5 py-6 md:block">
        <div className="sticky top-6">
          <Link
            href="/"
            className="block rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-2xl font-bold tracking-wide text-blue-400 transition hover:border-blue-400 hover:text-blue-300"
          >
            The System
          </Link>

          <p className="mt-4 mb-6 px-1 text-sm leading-6 text-zinc-400">
            Hunter command interface. Navigate quests, artifacts, progress, and system directives.
          </p>

          {status === "authenticated" && profile && (
            <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-100">
                {profile.display_name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-blue-300">
                {profile.role}
              </p>
            </div>
          )}

          <NavLinks pathname={pathname} />

          {status === "authenticated" && (
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
