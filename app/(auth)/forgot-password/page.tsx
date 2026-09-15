"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

const inputClassName =
  "rounded-lg border bg-black/40 px-3 py-2 text-(--foreground) outline-none transition-colors focus:border-(--color-gold-bright)";
const inputStyle = { borderColor: "rgba(215, 164, 65, 0.3)" };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    // Always show the same confirmation regardless of whether the email
    // exists (spec §9.1: no indication whether a reset address exists).
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <AuthCard title="Check your email">
        <p className="text-sm text-(--color-text-muted)">
          If an account exists for {email}, a reset link is on its way.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password">
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
          {submitting ? "Please wait..." : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
