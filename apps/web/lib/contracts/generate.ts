import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { summarizeContractForApproval } from "@/lib/ai/claude";
import { fetchResoProperty, mapResoProperty } from "@/lib/integrations/reso";
import {
  createDraftEnvelopeFromTemplate,
  sendEnvelope,
} from "@/lib/integrations/docusign";

export async function generateContract(input: {
  propertyId: string;
  buyerId: string;
  agentId?: string;
  offerPrice?: number;
  closingDate?: string;
  templateId?: string;
}) {
  const supabase = createAdminClient();

  const [{ data: buyer, error: buyerError }, { data: property, error: propertyError }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", input.buyerId).single(),
      supabase.from("properties").select("*").eq("id", input.propertyId).single(),
    ]);

  if (buyerError || !buyer) throw buyerError ?? new Error("Buyer not found");
  if (propertyError || !property) {
    throw propertyError ?? new Error("Property not found");
  }

  const agentId = input.agentId ?? buyer.agent_id;
  const { data: agent } = await supabase
    .from("users")
    .select("*")
    .eq("id", agentId)
    .single();

  if (property.listing_key) {
    try {
      const live = await fetchResoProperty(property.listing_key);
      if (live) {
        const mapped = mapResoProperty(live);
        await supabase.from("properties").update(mapped).eq("id", property.id);
        Object.assign(property, mapped);
      }
    } catch {
      // MLS outage should not block a draft approval card.
    }
  }

  const offerPrice = input.offerPrice ?? Number(property.list_price ?? 0) || null;
  const fieldMap = {
    buyer_name: buyer.full_name,
    buyer_email: buyer.email,
    buyer_phone: buyer.phone,
    property_address: [
      property.address_line,
      property.city,
      property.state,
      property.postal_code,
    ]
      .filter(Boolean)
      .join(", "),
    list_price: property.list_price,
    offer_price: offerPrice,
    closing_date: input.closingDate ?? null,
    school_district: property.school_district,
    agent_name: agent?.full_name ?? "",
    agent_brokerage: agent?.brokerage ?? "",
  };

  const summary = await summarizeContractForApproval({
    buyerName: buyer.full_name,
    propertyAddress: fieldMap.property_address,
    listPrice: property.list_price ? Number(property.list_price) : null,
    offerPrice,
    closingDate: input.closingDate ?? null,
  });

  const templateId =
    input.templateId ?? env.docusignPurchaseTemplateId() ?? null;

  let envelopeId: string | null = null;
  if (templateId && buyer.email) {
    const envelope = await createDraftEnvelopeFromTemplate({
      templateId,
      emailSubject: `Purchase agreement — ${fieldMap.property_address}`,
      roles: [
        {
          roleName: "Buyer",
          name: buyer.full_name,
          email: buyer.email,
          tabs: Object.fromEntries(
            Object.entries(fieldMap).map(([key, value]) => [
              key,
              value == null ? "" : String(value),
            ]),
          ),
        },
      ],
    });
    envelopeId = envelope.envelopeId;
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      agent_id: agentId,
      buyer_id: buyer.id,
      property_id: property.id,
      status: "pending_approval",
      template_id: templateId,
      envelope_id: envelopeId,
      offer_price: offerPrice,
      closing_date: input.closingDate ?? null,
      field_map: fieldMap,
      summary,
    })
    .select("*")
    .single();

  if (error) throw error;
  return contract;
}

export async function approveContract(contractId: string, note?: string) {
  const supabase = createAdminClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error || !contract) throw error ?? new Error("Contract not found");
  if (contract.status !== "pending_approval") {
    throw new Error(`Contract cannot be approved from ${contract.status}`);
  }

  if (contract.envelope_id) {
    await sendEnvelope(contract.envelope_id);
  }

  const { data: updated, error: updateError } = await supabase
    .from("contracts")
    .update({
      status: contract.envelope_id ? "sent" : "approved",
      approval_note: note ?? null,
      approved_at: new Date().toISOString(),
      sent_at: contract.envelope_id ? new Date().toISOString() : null,
    })
    .eq("id", contractId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return updated;
}
