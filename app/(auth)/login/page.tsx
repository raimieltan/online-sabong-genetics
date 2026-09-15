"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

type Mode = "sign-in" | "sign-up";

function isSameOriginRelativePath(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
  return true;
}

const inputClassName =
  "rounded-lg border bg-black/40 px-3 py-2 text-(--foreground) outline-none transition-colors focus:border-(--color-gold-bright)";
const inputStyle = { borderColor: "rgba(215, 164, 65, 0.3)" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rawNext = searchParams.get("next");
  const nextPath = isSameOriginRelativePath(rawNext) ? rawNext : "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("Invalid email or password.");
          return;
        }
        router.push(nextPath);
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError("Could not create account. Try a different email or password.");
          return;
        }
        setPendingConfirmation(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingConfirmation) {
    return (
      <AuthCard title="Check your email">
        <p className="text-sm text-(--color-text-muted)">
          We sent a confirmation link to {email}. Follow it to activate your dynasty.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={mode === "sign-in" ? "Sign in" : "Create your account"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
          <span className="text-xs tracking-wider uppercase">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
          <span className="text-xs tracking-wider uppercase">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            style={inputStyle}
          />
        </label>
        {mode === "sign-up" && (
          <label className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
            <span className="text-xs tracking-wider uppercase">Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              style={inputStyle}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm" style={{ color: "#d64b4b" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #f0c76b, #d5a342)",
            color: "#201309",
            border: "1px solid rgba(255, 220, 150, 0.85)",
            boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          }}
        >
          {submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-(--color-text-muted)">
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="underline hover:text-(--color-gold-bright)"
        >
          {mode === "sign-in" ? "Create an account" : "Have an account? Sign in"}
        </button>
        {mode === "sign-in" && (
          <a href="/forgot-password" className="underline hover:text-(--color-gold-bright)">
            Forgot password?
          </a>
        )}
      </div>
    </AuthCard>
  );
}
