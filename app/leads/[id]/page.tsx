import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lead, error } = await supabase
    .from("larkspur_leads")
    .select("*, larkspur_companies(*), larkspur_contacts(*)")
    .eq("id", id)
    .single();

  if (error || !lead) redirect("/leads");

  const company = lead.larkspur_companies as any;
  const contact = lead.larkspur_contacts as any;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <Link href="/leads">Back to Leads</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{company?.name}</h1>
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div><span className="font-medium">Industry:</span> {company?.industry || "—"}</div>
        <div><span className="font-medium">Location:</span> {company?.city}, {company?.state}</div>
        <div><span className="font-medium">Phone:</span> {company?.phone || "—"}</div>
        <div><span className="font-medium">Stage:</span> <span className="font-bold">{lead.stage}</span></div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Contact</h2>
        {contact ? (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {contact.name}</div>
            <div><span className="font-medium">Role:</span> {contact.role}</div>
            <div><span className="font-medium">Phone:</span> {contact.phone}</div>
          </div>
        ) : <p className="text-gray-500">No contact</p>}
      </div>
    </div>
  );
}