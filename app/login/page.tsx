"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signError) {
      setError(signError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 w-12 h-12 rounded-xl shadow-md"
            style={{
              background:
                "linear-gradient(135deg, #1a1b87 0%, #2d2f7f 40%, #8b97fe 100%)",
            }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold text-[#1a1b87] tracking-tight">
            Larkspur
          </h1>
          <p className="text-sm text-[#5960ca] mt-1">Sign in to Reach Out</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl shadow p-8 border border-[rgba(26,27,135,0.06)] space-y-4"
        >
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#2d2f7f] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8b97fe]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#2d2f7f] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
        </form>
      </div>
    </div>
  );
}
