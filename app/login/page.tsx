"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SYMBOL_DATA_URI } from "@/lib/brand/logoAssets";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Success → hard navigate so middleware + cookies are fully applied
    window.location.href = "/";
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
            Larkspur
          </h1>
          <p className="text-sm text-[#5960ca] mt-1">Sign in to Reach Out</p>
        </div>

        <form
          onSubmit={handleSignIn}
          className="bg-white rounded-xl shadow p-8 border border-[rgba(26,27,135,0.06)] space-y-4"
        >
          {message && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#2d2f7f]"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#5960ca] hover:text-[#1a1b87] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: "#1a1b87" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm text-[#5960ca]">
            New here?{" "}
            <Link href="/signup" className="font-medium text-[#1a1b87] hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
