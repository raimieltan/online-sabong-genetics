"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

const inputClassName =
  "rounded-lg border bg-black/40 px-3 py-2 text-(--foreground) outline-none transition-colors focus:border-(--color-gold-bright)";
const inputStyle = { borderColor: "rgba(215, 164, 65, 0.3)" };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError("Could not reset password. Request a new reset link and try again.");
      return;
    }

    router.push("/");
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
          <span className="text-xs tracking-wider uppercase">New password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
          <span className="text-xs tracking-wider uppercase">Confirm new password</span>
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
          {submitting ? "Please wait..." : "Reset password"}
        </button>
      </form>
    </AuthCard>
  );
}
