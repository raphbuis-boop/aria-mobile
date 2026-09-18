import { createAdminClient } from "@/lib/supabase/admin";
import { extractClientFacts } from "@/lib/ai/claude";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "");

  if (!from || !body) {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, agent_id")
    .eq("phone", from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lead) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from("conversation_messages").insert({
      conversation_id: conversation?.id,
      agent_id: lead.agent_id,
      direction: "inbound",
      body,
      provider_message_id: String(form.get("MessageSid") ?? ""),
    });

    try {
      const facts = await extractClientFacts(body);
      if (facts.budgetMax || facts.timeline || facts.locationPreference) {
        await supabase
          .from("leads")
          .update({
            budget_min: facts.budgetMin,
            budget_max: facts.budgetMax,
            timeline: facts.timeline,
            preferred_location: facts.locationPreference,
            status: "qualified",
            qualified_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
      }
    } catch (error) {
      console.error("SMS parse failed", error);
    }
  }

  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
    headers: { "Content-Type": "text/xml" },
  });
}
