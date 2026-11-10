import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <h1 className="font-serif text-5xl">Welcome back</h1>
      <p className="mt-3 text-muted">Sign in to browse the collection, check out faster and follow your orders.</p>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-mist" aria-hidden="true" />}>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
