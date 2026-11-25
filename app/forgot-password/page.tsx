"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WORDMARK_DATA_URI } from "@/lib/brand/logoAssets";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("If that email is registered, a reset link is on its way.");
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_DATA_URI}
            alt="Larkspur"
            height={40}
            className="mx-auto mb-4 h-10 w-auto max-w-[200px] object-contain"
          />
          <h1 className="text-2xl font-semibold text-[#1a1b87] tracking-tight">
            Reset password
          </h1>
          <p className="text-sm text-[#5960ca] mt-1">
            We will email you a reset link
          </p>
        </div>

        <form
          onSubmit={handleReset}
          className="bg-white rounded-xl shadow p-8 border border-[rgba(26,27,135,0.06)] space-y-4"
        >
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {message && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              {message}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#2d2f7f] mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: "#1a1b87" }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-[#5960ca]">
            <Link href="/login" className="font-medium text-[#1a1b87] hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
