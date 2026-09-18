import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { draftQualificationSms } from "@/lib/ai/claude";
import { sendSms } from "@/lib/integrations/twilio";

type LeadRow = {
  id: string;
  agent_id: string;
  full_name: string;
  phone: string | null;
  source: string;
  listing_id: string | null;
  preferred_location: string | null;
  message: string | null;
  qualification_sent_at: string | null;
};

export async function ingestNormalizedLead(
  lead: ReturnType<typeof import("./normalize").normalizeInboundLead>,
) {
  const supabase = createAdminClient();

  if (lead.providerEventId) {
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id, processed_at")
      .eq("provider", lead.source)
      .eq("event_id", lead.providerEventId)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      return { duplicate: true as const, leadId: null };
    }

    await supabase.from("webhook_events").upsert(
      {
        provider: lead.source,
        event_id: lead.providerEventId,
        payload: lead.rawPayload,
      },
      { onConflict: "provider,event_id" },
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      agent_id: lead.agentId,
      property_id: lead.propertyId,
      source: lead.source,
      provider_event_id: lead.providerEventId,
      listing_id: lead.listingId,
      first_name: lead.firstName,
      last_name: lead.lastName,
      full_name: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      budget_min: lead.budgetMin,
      budget_max: lead.budgetMax,
      preferred_location: lead.preferredLocation,
      timeline: lead.timeline,
      raw_payload: lead.rawPayload,
      status: "new",
    })
    .select("id")
    .single();

  if (error) throw error;

  if (lead.providerEventId) {
    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", lead.source)
      .eq("event_id", lead.providerEventId);
  }

  const n8nUrl = env.n8nWebhookUrl();
  if (n8nUrl) {
    void fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: data.id, agentId: lead.agentId }),
    }).catch(() => undefined);
  }

  return { duplicate: false as const, leadId: data.id as string };
}

export async function qualifyLead(leadId: string) {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, agent_id, full_name, phone, source, listing_id, preferred_location, message, qualification_sent_at",
    )
    .eq("id", leadId)
    .single<LeadRow>();

  if (error || !lead) throw error ?? new Error("Lead not found");
  if (lead.qualification_sent_at) {
    return { skipped: true as const, reason: "already_sent" };
  }
  if (!lead.phone) {
    await markJob(supabase, leadId, "failed", "Lead has no phone number");
    return { skipped: true as const, reason: "missing_phone" };
  }

  const { data: agent } = await supabase
    .from("users")
    .select("full_name, twilio_from_number")
    .eq("id", lead.agent_id)
    .single();

  const drafted = await draftQualificationSms({
    agentName: agent?.full_name || "your agent",
    leadName: lead.full_name.split(" ")[0] ?? "there",
    source: lead.source,
    listingHint: lead.listing_id,
    location: lead.preferred_location,
    message: lead.message,
  });

  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      agent_id: lead.agent_id,
      lead_id: lead.id,
      channel: "sms",
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const message = await sendSms({
    to: lead.phone,
    body: drafted.smsBody,
    from: agent?.twilio_from_number,
  });

  await supabase.from("conversation_messages").insert({
    conversation_id: conversation?.id,
    agent_id: lead.agent_id,
    direction: "outbound",
    body: drafted.smsBody,
    provider_message_id: message.sid,
    ai_generated: true,
    metadata: { intent: drafted.intent, rationale: drafted.rationale },
  });

  await supabase
    .from("leads")
    .update({
      qualification_sent_at: new Date().toISOString(),
      last_contacted_at: new Date().toISOString(),
      status: drafted.intent === "disqualify" ? "disqualified" : "qualifying",
    })
    .eq("id", lead.id);

  await markJob(supabase, leadId, "sent");
  return { skipped: false as const, sid: message.sid };
}

async function markJob(
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string,
  status: "sent" | "failed",
  lastError?: string,
) {
  await supabase
    .from("qualification_jobs")
    .update({
      status,
      last_error: lastError ?? null,
      completed_at: new Date().toISOString(),
      attempt_count: 1,
    })
    .eq("lead_id", leadId)
    .eq("status", "queued");
}
