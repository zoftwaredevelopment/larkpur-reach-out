"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SYMBOL_DATA_URI } from "@/lib/brand/logoAssets";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated. Redirecting…");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SYMBOL_DATA_URI}
            alt="Larkspur"
            width={48}
            height={48}
            className="mx-auto mb-4 h-12 w-12 object-contain"
          />
          <h1 className="text-2xl font-semibold text-[#1a1b87] tracking-tight">
            Choose a new password
          </h1>
          <p className="text-sm text-[#5960ca] mt-1">
            Enter and confirm your new password
          </p>
        </div>

        <form
          onSubmit={handleUpdate}
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
              htmlFor="password"
              className="block text-xs font-medium text-[#2d2f7f] mb-1"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-xs font-medium text-[#2d2f7f] mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: "#1a1b87" }}
          >
            {loading ? "Saving…" : "Update password"}
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
