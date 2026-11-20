"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="px-2.5 py-1.5 rounded-md text-sm font-medium text-[#5960ca] hover:bg-[#f3f4ff] transition-colors"
    >
      Sign out
    </button>
  );
}
