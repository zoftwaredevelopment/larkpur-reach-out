"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SYMBOL_DATA_URI } from "@/lib/brand/logoAssets";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If session exists, email confirmation is off → go in
    if (data.session) {
      window.location.href = "/";
      return;
    }

    setMessage(
      "Account created. Check your email to confirm, then sign in."
    );
    setLoading(false);
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
            Create account
          </h1>
          <p className="text-sm text-[#5960ca] mt-1">
            Join the Larkspur Reach Out team
          </p>
        </div>

        <form
          onSubmit={handleSignUp}
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
              htmlFor="name"
              className="block text-xs font-medium text-[#2d2f7f] mb-1"
            >
              Display name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ada"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
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
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#2d2f7f] mb-1"
            >
              Password
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
            <p className="text-xs text-slate-400 mt-1">At least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: "#1a1b87" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-[#5960ca]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#1a1b87] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
