import { z } from "zod";
import {
  CONVERSATION_CHANNELS,
  CONTRACT_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  MEMORY_KINDS,
} from "./constants";

export const leadSourceSchema = z.enum(LEAD_SOURCES);
export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const conversationChannelSchema = z.enum(CONVERSATION_CHANNELS);
export const contractStatusSchema = z.enum(CONTRACT_STATUSES);
export const memoryKindSchema = z.enum(MEMORY_KINDS);

export const inboundLeadWebhookSchema = z.object({
  source: leadSourceSchema.default("website"),
  providerEventId: z.string().min(1).optional(),
  agentId: z.string().uuid().optional(),
  listingId: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  message: z.string().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  preferredLocation: z.string().optional(),
  timeline: z.string().optional(),
  raw: z.unknown().optional(),
});

export type InboundLeadWebhook = z.infer<typeof inboundLeadWebhookSchema>;

export const normalizedLeadSchema = z.object({
  source: leadSourceSchema,
  providerEventId: z.string().nullable(),
  agentId: z.string().uuid(),
  listingId: z.string().nullable(),
  propertyId: z.string().uuid().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  message: z.string().nullable(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  preferredLocation: z.string().nullable(),
  timeline: z.string().nullable(),
  rawPayload: z.unknown(),
});

export type NormalizedLead = z.infer<typeof normalizedLeadSchema>;

export const transcriptWebhookSchema = z.object({
  leadId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  callSid: z.string().optional(),
  agentId: z.string().uuid().optional(),
  channel: conversationChannelSchema.default("voice"),
  transcript: z.string().min(20),
  durationSeconds: z.number().int().positive().optional(),
  occurredAt: z.string().datetime().optional(),
});

export type TranscriptWebhook = z.infer<typeof transcriptWebhookSchema>;

export const extractedClientFactsSchema = z.object({
  summary: z.string(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  timeline: z.string().nullable(),
  locationPreference: z.string().nullable(),
  beds: z.number().nullable(),
  baths: z.number().nullable(),
  mustHaves: z.array(z.string()),
  dealBreakers: z.array(z.string()),
  financing: z.string().nullable(),
  motivation: z.string().nullable(),
  nextAction: z.string().nullable(),
  memories: z.array(
    z.object({
      kind: memoryKindSchema,
      content: z.string().min(1),
      importance: z.number().min(0).max(1),
    }),
  ),
});

export type ExtractedClientFacts = z.infer<typeof extractedClientFactsSchema>;

export const qualificationIntentSchema = z.object({
  smsBody: z.string().max(320),
  intent: z.enum(["qualify", "nurture", "disqualify", "schedule"]),
  rationale: z.string(),
});

export type QualificationIntent = z.infer<typeof qualificationIntentSchema>;

export const contractGenerationRequestSchema = z.object({
  propertyId: z.string().uuid(),
  buyerId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  offerPrice: z.number().positive().optional(),
  closingDate: z.string().optional(),
  templateId: z.string().optional(),
});

export type ContractGenerationRequest = z.infer<
  typeof contractGenerationRequestSchema
>;
