import { createAdminClient } from "@/lib/supabase/admin";
import { extractClientFacts } from "@/lib/ai/claude";
import { embedText } from "@/lib/ai/embeddings";

export async function ingestTranscript(input: {
  transcript: string;
  leadId?: string;
  conversationId?: string;
  agentId?: string;
  channel?: "sms" | "voice" | "email" | "whatsapp" | "in_app";
  callSid?: string;
}) {
  const supabase = createAdminClient();
  const facts = await extractClientFacts(input.transcript);

  let leadId = input.leadId;
  let agentId = input.agentId;

  if (!leadId && input.conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, lead_id, agent_id")
      .eq("id", input.conversationId)
      .single();
    leadId = data?.lead_id;
    agentId = agentId ?? data?.agent_id;
  }

  if (!leadId || !agentId) {
    throw new Error("Transcript is not linked to a lead/agent");
  }

  const { data: conversation } = input.conversationId
    ? { data: { id: input.conversationId } }
    : await supabase
        .from("conversations")
        .insert({
          agent_id: agentId,
          lead_id: leadId,
          channel: input.channel ?? "voice",
          provider_thread_id: input.callSid ?? null,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

  await supabase.from("conversation_messages").insert({
    conversation_id: conversation?.id,
    agent_id: agentId,
    direction: "system",
    body: input.transcript,
    ai_generated: false,
    metadata: { kind: "transcript", callSid: input.callSid },
  });

  await supabase.from("conversation_messages").insert({
    conversation_id: conversation?.id,
    agent_id: agentId,
    direction: "system",
    body: facts.summary,
    ai_generated: true,
    metadata: { kind: "call_summary" },
  });

  const memoryRows = [];
  for (const memory of [
    ...facts.memories,
    {
      kind: "call_summary" as const,
      content: facts.summary,
      importance: 0.9,
    },
  ]) {
    const embedding = await embedText(memory.content);
    memoryRows.push({
      agent_id: agentId,
      lead_id: leadId,
      kind: memory.kind,
      content: memory.content,
      importance: memory.importance,
      source_conversation_id: conversation?.id ?? null,
      embedding,
    });
  }

  await supabase.from("client_memories").insert(memoryRows);

  await supabase
    .from("leads")
    .update({
      budget_min: facts.budgetMin,
      budget_max: facts.budgetMax,
      preferred_location: facts.locationPreference,
      timeline: facts.timeline,
      status: "qualified",
      qualified_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  return { leadId, facts, memoryCount: memoryRows.length };
}
