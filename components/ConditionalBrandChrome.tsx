"use client";

import { usePathname } from "next/navigation";
import { BrandChrome } from "@/components/BrandChrome";

const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

/**
 * Renders the global header only on authenticated app routes.
 * Auth pages show a single centered wordmark in the form — never two logos.
 */
export function ConditionalBrandChrome() {
  const pathname = usePathname() || "";
  const isAuth = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isAuth) return null;
  return <BrandChrome />;
}
