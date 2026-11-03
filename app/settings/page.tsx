import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RunIngestionButton } from "./RunIngestionButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: searches } = await supabase
    .from("larkspur_saved_searches")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: ingestionRuns } = await supabase
    .from("larkspur_ingestion_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure saved searches and view ingestion history</p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Searches */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Saved Searches</h2>
            <form action="/api/create-search" method="POST">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                + Add Search
              </button>
            </form>
          </div>
          {searches && searches.length > 0 ? (
            <div className="space-y-3">
              {searches.map((search: any) => (
                <div key={search.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{search.label}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Industry: {search.industry || "All"} • City: {search.city || "All"}
                      </div>
                      {search.keywords.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Keywords: {search.keywords.join(", ")}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        search.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {search.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No saved searches yet</p>
          )}
        </div>

        {/* Ingestion History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ingestion History</h2>
            <RunIngestionButton />
          </div>
          {ingestionRuns && ingestionRuns.length > 0 ? (
            <div className="space-y-3">
              {ingestionRuns.map((run: any) => (
                <div key={run.id} className="p-3 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{run.source}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(run.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    Fetched: {run.fetched_count} • Inserted: {run.inserted_count} •
                    Duplicates: {run.duplicate_count}
                  </div>
                  {run.error && (
                    <div className="text-red-600 mt-1">Error: {run.error}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No ingestion runs yet</p>
          )}
        </div>
      </div>
    </div>
  );
}