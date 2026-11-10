"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, type FormEvent } from "react";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";

const initial: AuthState = {};

/** One form for both sign-in and sign-up; `mode` decides the fields and wording. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignUp = mode === "signup";
  const [state, action, pending] = useActionState(isSignUp ? signUp : signIn, initial);
  const next = useSearchParams().get("next") ?? "";
  const errors = state.fieldErrors ?? {};
  const other = isSignUp ? "/login" : "/signup";

  /** Submitted by hand so a failed attempt keeps what was typed. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const field = (name: string) => ({ id: name, name, className: "field-input", "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined });
  const hint = (name: string) => errors[name] && <p id={`${name}-error`} className="field-error">{errors[name]}</p>;

  return (
    <>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        {isSignUp && (
          <div>
            <label htmlFor="name" className="field-label">Your name</label>
            <input {...field("name")} autoComplete="name" required />
            {hint("name")}
          </div>
        )}
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input {...field("email")} type="email" inputMode="email" autoComplete="email" required />
          {hint("email")}
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input {...field("password")} type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required />
          {isSignUp && !errors.password && <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>}
          {hint("password")}
        </div>
        {state.error && <p role="alert" className="field-error">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {isSignUp ? "Already have an account?" : "New to Berloria?"}{" "}
        <Link href={next ? `${other}?next=${encodeURIComponent(next)}` : other} className="link-underline text-ink">
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}
