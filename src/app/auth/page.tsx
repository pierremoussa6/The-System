"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "../auth-context";
import ActionButton from "../components/ActionButton";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const { signIn, signUp, status, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        await signIn(email, password);
      } else {
        const signUpMessage = await signUp(email, password, displayName);
        setMessage(signUpMessage ?? "Account created. Enter The System.");
      }
    } catch (authError) {
      setMessage(
        authError instanceof Error
          ? authError.message
          : "The System rejected the request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "unconfigured") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <PanelCard className="border-yellow-500">
          <SectionTitle
            title="Auth Setup"
            colorClass="text-yellow-400"
            subtitle="Supabase credentials are needed before hosted logins can activate."
          />

          <div className="space-y-4">
            <p className="text-zinc-300">
              Add these values to your local and Vercel environment variables:
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-200">
              <p>NEXT_PUBLIC_SUPABASE_URL</p>
              <p>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
            </div>

            <Link href="/">
              <ActionButton variant="gray">Continue Local Prototype</ActionButton>
            </Link>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
      <PanelCard className="w-full border-blue-500">
        <SectionTitle
          title={mode === "sign-in" ? "Enter The System" : "Create Account"}
          colorClass="text-blue-400"
          subtitle="Use one account across desktop and phone."
        />

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "sign-up" && (
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">
                Display name
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                className="w-full px-4 py-3"
                placeholder="Hunter name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-3"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3"
              placeholder="Minimum 6 characters"
            />
          </label>

          {(message || error) && (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              {message || error}
            </div>
          )}

          <ActionButton
            type="submit"
            variant="blue"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? "Contacting The System..."
              : mode === "sign-in"
              ? "Sign In"
              : "Sign Up"}
          </ActionButton>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span>
            {mode === "sign-in"
              ? "Need a player account?"
              : "Already initiated?"}
          </span>
          <button
            type="button"
            className="text-blue-300 transition hover:text-blue-200"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setMessage(null);
            }}
          >
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </button>
        </div>
      </PanelCard>
    </div>
  );
}
