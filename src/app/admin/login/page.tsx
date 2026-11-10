import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
          <p className="eyebrow mt-3">Studio admin</p>
        </div>
        <div className="card">
          <h1 className="font-serif text-3xl">Sign in</h1>
          <p className="mt-2 text-sm text-muted">For studio staff. Customers don&rsquo;t need this page.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
