"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApproveButtonProps {
  companyId: string;
}

export function ApproveButton({ companyId }: ApproveButtonProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setApproving(true);

    const formData = new FormData();
    formData.append("company_id", companyId);

    try {
      const res = await fetch("/api/approve-lead", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to approve company");
        setApproving(false);
        return;
      }

      // Navigate straight to the lead page so you can generate/send a message
      router.push(`/leads/${data.leadId}`);
    } catch (err) {
      alert("Something went wrong");
      setApproving(false);
    }
  };

  const disapprove = async (companyId: string) => {
    if (!confirm("Disapprove this company? This will permanently delete it from your pipeline.")) return;

    try {
      const res = await fetch("/api/disapprove-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to disapprove company");
        return;
      }

      // Reload the page to reflect the deletion
      router.refresh();
    } catch (err) {
      alert("Something went wrong");
    }
  };

  return (
    <div className="flex gap-3">
      <form onSubmit={handleApprove}>
        <button
          type="submit"
          disabled={approving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
        >
          {approving ? "Approving…" : "Approve as Lead"}
        </button>
      </form>
      <button
        onClick={() => disapprove(companyId)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
      >
        Disapprove
      </button>
    </div>
  );
}