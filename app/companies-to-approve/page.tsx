import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ApproveButton } from "./ApproveButton";

export const dynamic = "force-dynamic";

export default async function CompaniesToApprovePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch companies that don't have a lead yet
  const { data: allCompanies } = await supabase
    .from("larkspur_companies")
    .select("*, larkspur_leads(id)")
    .order("created_at", { ascending: false });

  const unapprovedCompanies = allCompanies?.filter(
    (c: any) => !c.larkspur_leads || c.larkspur_leads.length === 0
  ) || [];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies to Approve</h1>
          <p className="text-gray-600 mt-1">
            Approve companies as leads to start outreach
          </p>
        </div>
        <Link
          href="/leads"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← View All Leads
        </Link>
      </div>

      {unapprovedCompanies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">All companies are already approved</p>
          <Link
            href="/leads"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Leads →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {unapprovedCompanies.length} company{"s"} to approve
            </h2>
          </div>
          <div className="divide-y">
            {unapprovedCompanies.map((company: any) => (
              <div key={company.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {company.name}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div>Industry: {company.industry || "Not specified"}</div>
                      <div>Location: {company.city}, {company.state}</div>
                      {company.phone && <div>Phone: {company.phone}</div>}
                      {company.website && (
                        <div>
                          Website:{" "}
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <ApproveButton companyId={company.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}