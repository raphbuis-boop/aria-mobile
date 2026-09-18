export const LEAD_SOURCES = [
  "meta_ads",
  "zillow",
  "realtor",
  "manual",
  "referral",
  "website",
] as const;

export const LEAD_STATUSES = [
  "new",
  "qualifying",
  "qualified",
  "nurture",
  "appointment_set",
  "under_contract",
  "closed",
  "lost",
  "disqualified",
] as const;

export const CONVERSATION_CHANNELS = ["sms", "voice", "email", "whatsapp", "in_app"] as const;

export const CONTRACT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "signed",
  "voided",
  "error",
] as const;

export const MEMORY_KINDS = [
  "preference",
  "budget",
  "timeline",
  "location",
  "property_feedback",
  "call_summary",
  "family",
  "financing",
  "objection",
] as const;

export const QUALIFICATION_SLA_MS = 20_000;

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const CLAUDE_MODEL = "claude-sonnet-4-5";
