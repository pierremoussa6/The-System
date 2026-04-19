import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "./auth-context";
import AuthenticatedShell from "./components/AuthenticatedShell";

export const metadata: Metadata = {
  title: "The System",
  description: "Solo Leveling-inspired life RPG system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <AuthProvider>
          <Suspense fallback={null}>
            <AuthenticatedShell>{children}</AuthenticatedShell>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
