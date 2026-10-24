import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    cron_secret: process.env.CRON_SECRET || "NOT SET",
    cron_secret_length: process.env.CRON_SECRET?.length || 0,
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}