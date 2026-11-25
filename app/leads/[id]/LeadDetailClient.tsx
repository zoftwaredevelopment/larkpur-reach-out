"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { SendConfirmBar } from "../SendConfirmBar";
import { createClient } from "@/lib/supabase/client";

// TEMP: full file restored in next commit if this is incomplete — see RESTORE
export function LeadDetailClient(props: any) {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <p className="text-red-600 text-sm mb-4">
        Detail page is being restored. Hard-refresh in a minute.
      </p>
      <Link href="/leads" className="text-blue-600">← Back to Leads</Link>
    </div>
  );
}
