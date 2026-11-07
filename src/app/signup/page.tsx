import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth-panels";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80dvh] items-center justify-center text-[var(--text-3)]">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
