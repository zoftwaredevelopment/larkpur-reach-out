import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Industry } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { label, industry, city, keywords } = (await request.json()) as {
    label: string;
    industry?: Industry;
    city?: string;
    keywords?: string[];
  };

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("larkspur_saved_searches")
    .insert({
      label,
      industry,
      city,
      keywords: keywords || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}