import { createAdminClient } from "@/lib/supabase/admin";

const SEARCHES = [
  { label: "Law firms Lagos", industry: "law_firm", city: "Lagos", keywords: ["law firm", "lawyer", "attorney", "legal services"] },
  { label: "Accounting firms Lagos", industry: "accounting", city: "Lagos", keywords: ["accounting firm", "accountant", "tax consultant"] },
  { label: "Consulting firms Lagos", industry: "consulting", city: "Lagos", keywords: ["consulting firm", "business consultant", "management consultant"] },
];

export async function seed() {
  const supabase = createAdminClient();
  for (const s of SEARCHES) {
    const { error } = await supabase
      .from("larkspur_saved_searches")
      .insert(s);
    if (error) console.error(`Error seeding ${s.label}:`, error.message);
    else console.log(`Seeded: ${s.label}`);
  }
  console.log("Seed complete");
}

seed().catch(console.error);