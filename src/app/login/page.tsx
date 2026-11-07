import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-panels";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80dvh] items-center justify-center text-[var(--text-3)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
