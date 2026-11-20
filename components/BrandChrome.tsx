import Link from "next/link";

/**
 * Global brand shell — logo lockup + nav. Cosmetic only; no feature logic.
 */
export function BrandChrome() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,27,135,0.08)] bg-white/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          {/* Symbol mark — geometric stand-in matching brand navy/lavender until vector assets are added to /public */}
          <span
            aria-hidden
            className="shrink-0 w-8 h-8 rounded-lg shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, #1a1b87 0%, #2d2f7f 40%, #8b97fe 100%)",
            }}
          />
          <span className="flex flex-col min-w-0 leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-[#1a1b87] group-hover:text-[#2d2f7f]">
              Larkspur
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5960ca]">
              Reach Out
            </span>
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
        </nav>
      </div>
    </header>
  );
}
