import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadDetailClient } from "./LeadDetailClient";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const { data: lead, error } = await supabase
    .from("larkspur_leads")
    .select("*, larkspur_companies(*), larkspur_contacts(*)")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !lead) {
    redirect("/leads");
  }

  const { data: intData } = await supabase
    .from("larkspur_interactions")
    .select("*")
    .eq("lead_id", resolvedParams.id)
    .order("created_at", { ascending: true });

  return (
    <LeadDetailClient
      lead={lead}
      interactions={intData || []}
      company={lead.larkspur_companies}
      contact={lead.larkspur_contacts}
    />
  );
}