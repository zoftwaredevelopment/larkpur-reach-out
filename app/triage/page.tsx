import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TriagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch companies without leads (not yet triaged)
  const { data: companies } = await supabase
    .from("larkspur_companies")
    .select("*")
    .is("id", null) // This won't work, need to check if lead exists
    .order("created_at", { ascending: false })
    .limit(50);

  // Better approach: fetch companies that don't have a lead
  const { data: allCompanies } = await supabase
    .from("larkspur_companies")
    .select("*, larkspur_leads(id)")
    .order("created_at", { ascending: false })
    .limit(50);

  const untriagedCompanies = allCompanies?.filter((c: any) => !c.larkspur_leads) || [];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Triage</h1>
          <p className="text-gray-600 mt-1">
            Review companies from Google Places and approve them as leads
          </p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {untriagedCompanies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No companies to triage</p>
          <Link
            href="/settings"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Configure saved searches →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {untriagedCompanies.length} companies to review
            </h2>
          </div>
          <div className="divide-y">
            {untriagedCompanies.map((company: any) => (
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
                  <div className="flex gap-2">
                    <form action={`/api/approve-lead`} method="POST">
                      <input type="hidden" name="company_id" value={company.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={`/api/discard-lead`} method="POST">
                      <input type="hidden" name="company_id" value={company.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                      >
                        Discard
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}