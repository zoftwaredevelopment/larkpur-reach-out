import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestion/google-places";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaries = await runIngestion();
  return NextResponse.json({ summaries });
}