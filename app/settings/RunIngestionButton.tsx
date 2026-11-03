"use client";

import { useState } from "react";

export function RunIngestionButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunIngestion = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ingest", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ingestion failed");
      }

      const data = await res.json();
      setResult(
        `Ingestion complete! ${JSON.stringify(data.summaries, null, 2)}`
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={handleRunIngestion}
        disabled={loading}
        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
      >
        {loading ? "Running..." : "Run Ingestion"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {result && (
        <pre className="mt-2 text-xs text-green-700 whitespace-pre-wrap">{result}</pre>
      )}
    </div>
  );
}