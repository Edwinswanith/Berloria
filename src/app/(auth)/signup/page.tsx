import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <>
      <h1 className="font-serif text-5xl">Create your account</h1>
      <p className="mt-3 text-muted">It takes a minute. You&rsquo;ll use it to shop, check out and follow your orders.</p>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-mist" aria-hidden="true" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
