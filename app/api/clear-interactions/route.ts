
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const leadId = searchParams.get("lead_id");

    // Require an explicit deletion scope
    if (scope !== "all" && !leadId) {
      return NextResponse.json(
        { error: "A deletion scope or lead_id is required." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("larkspur_interactions")
      .delete()
      .select("id");

    if (scope === "all") {
      // Delete conversation history across every lead
      query = query.not("id", "is", null);
    } else {
      // Delete conversation history for one lead only
      query = query.eq("lead_id", leadId!);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Clear interactions error:", error);

      return NextResponse.json(
        { error: "Could not clear conversation history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length ?? 0,
    });

  } catch (error) {
    console.error("Clear interactions error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
