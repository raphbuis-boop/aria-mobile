import { createClient } from "@/lib/supabase/server";

export async function loadDeskData() {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims.sub as string | undefined;
    if (!userId) {
      return { authed: false as const, leads: [], contracts: [], jobs: [] };
    }

    const [leads, contracts, jobs] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, full_name, status, source, phone, preferred_location, created_at, qualification_sent_at",
        )
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("contracts")
        .select(
          "id, status, summary, offer_price, created_at, buyer_id, property_id",
        )
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("qualification_jobs")
        .select("id, status, created_at, last_error")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      authed: true as const,
      leads: leads.data ?? [],
      contracts: contracts.data ?? [],
      jobs: jobs.data ?? [],
    };
  } catch {
    return { authed: false as const, leads: [], contracts: [], jobs: [] };
  }
}
