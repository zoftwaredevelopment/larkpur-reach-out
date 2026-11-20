import Link from "next/link";
import { SYMBOL_DATA_URI, WORDMARK_DATA_URI } from "@/lib/brand/logoAssets";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Global brand shell — official logo lockup + nav. Cosmetic only.
 */
export function BrandChrome() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,27,135,0.08)] bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SYMBOL_DATA_URI}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain shrink-0"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_DATA_URI}
            alt="Larkspur"
            height={28}
            className="h-7 w-auto object-contain hidden sm:block"
          />
          <span className="sm:hidden text-[15px] font-semibold tracking-tight text-[#1a1b87]">
            Larkspur
          </span>
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
