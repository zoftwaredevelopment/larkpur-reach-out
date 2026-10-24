import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStage, InteractionType } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lead_id, stage, interaction_type, message_content } = (await request.json()) as {
    lead_id: string;
    stage?: LeadStage;
    interaction_type?: InteractionType;
    message_content?: string;
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updateData: any = {};
  if (stage) updateData.stage = stage;
  if (stage) updateData.last_contacted_at = new Date().toISOString();

  const { error: leadError } = await admin
    .from("larkspur_leads")
    .update(updateData)
    .eq("id", lead_id);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  // Log the interaction
  if (interaction_type) {
    await admin.from("larkspur_interactions").insert({
      lead_id,
      type: interaction_type,
      message_content,
      sent_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}