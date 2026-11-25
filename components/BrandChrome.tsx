import Link from "next/link";
import { WORDMARK_DATA_URI } from "@/lib/brand/logoAssets";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Global brand shell — single official lockup (Larkspur + butterfly), not
 * butterfly mark + wordmark side by side.
 */
export function BrandChrome() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,27,135,0.08)] bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_DATA_URI}
            alt="Larkspur"
            height={28}
            className="h-7 w-auto max-w-[160px] object-contain object-left"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-[#2d2f7f]">
          <Link
            href="/leads"
            className="px-2.5 py-1.5 rounded-md hover:bg-[#f3f4ff] transition-colors"
          >
            Leads
          </Link>
          <Link
            href="/follow-ups"
            className="px-2.5 py-1.5 rounded-md hover:bg-[#f3f4ff] transition-colors"
          >
            Follow-ups
          </Link>
          <Link
            href="/activity"
            className="px-2.5 py-1.5 rounded-md hover:bg-[#f3f4ff] transition-colors hidden sm:inline"
          >
            Calendar
          </Link>
          <Link
            href="/settings"
            className="px-2.5 py-1.5 rounded-md hover:bg-[#f3f4ff] transition-colors"
          >
            Settings
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
