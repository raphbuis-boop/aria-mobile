import {
  inboundLeadWebhookSchema,
  type InboundLeadWebhook,
  type NormalizedLead,
} from "@aria/shared";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[$,]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function detectLeadSource(payload: unknown, hint?: string) {
  if (hint === "meta" || hint === "meta_ads") return "meta_ads" as const;
  if (hint === "zillow") return "zillow" as const;
  if (hint === "realtor") return "realtor" as const;

  const record = asRecord(payload);
  if (record.object === "page" || Array.isArray(record.entry)) return "meta_ads";
  if (record.ListingId || record.zpid || record.zillowLeadId) return "zillow";
  if (record.leadGuid || record.realtorLeadId) return "realtor";
  return "website";
}

export function flattenMetaLead(payload: unknown): UnknownRecord {
  const record = asRecord(payload);
  const entry = Array.isArray(record.entry) ? asRecord(record.entry[0]) : {};
  const changes = Array.isArray(entry.changes) ? asRecord(entry.changes[0]) : {};
  const value = asRecord(changes.value);
  const fieldData = Array.isArray(value.field_data)
    ? (value.field_data as UnknownRecord[])
    : [];

  const fields: UnknownRecord = {};
  for (const field of fieldData) {
    const name = readString(field.name);
    const values = Array.isArray(field.values) ? field.values : [];
    if (name) fields[name] = values[0];
  }

  return {
    providerEventId: readString(value.leadgen_id, record.leadgen_id),
    firstName: readString(fields.first_name, fields.full_name),
    lastName: readString(fields.last_name),
    fullName: readString(fields.full_name),
    email: readString(fields.email),
    phone: readString(fields.phone_number, fields.phone),
    message: readString(fields.message),
    listingId: readString(value.page_id),
  };
}

export function flattenZillowLead(payload: unknown): UnknownRecord {
  const record = asRecord(payload);
  const consumer = asRecord(record.consumer ?? record.Contact);
  return {
    providerEventId: readString(
      record.zillowLeadId,
      record.LeadId,
      record.eventId,
    ),
    firstName: readString(consumer.firstName, record.firstName),
    lastName: readString(consumer.lastName, record.lastName),
    email: readString(consumer.email, record.email),
    phone: readString(consumer.phone, record.phone),
    message: readString(record.message, record.comments),
    listingId: readString(record.ListingId, record.zpid, record.listingId),
    preferredLocation: readString(record.city, record.preferredLocation),
    budgetMax: readNumber(record.price, record.maxPrice),
  };
}

export function normalizeInboundLead(
  payload: unknown,
  options?: { sourceHint?: string; agentId?: string },
): NormalizedLead {
  const source = detectLeadSource(payload, options?.sourceHint);
  const flattened =
    source === "meta_ads"
      ? flattenMetaLead(payload)
      : source === "zillow"
        ? flattenZillowLead(payload)
        : asRecord(payload);

  const parsed: InboundLeadWebhook = inboundLeadWebhookSchema.parse({
    source,
    ...flattened,
    ...asRecord(payload),
    agentId: options?.agentId ?? readString(asRecord(payload).agentId),
  });

  const composedName = [parsed.firstName, parsed.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fullName =
    parsed.fullName ||
    composedName ||
    parsed.email ||
    parsed.phone ||
    "Unknown lead";

  if (!parsed.agentId) {
    throw new Error("Lead is missing agentId / DEFAULT_AGENT_ID");
  }

  return {
    source: parsed.source,
    providerEventId: parsed.providerEventId ?? null,
    agentId: parsed.agentId,
    listingId: parsed.listingId ?? null,
    propertyId: parsed.propertyId ?? null,
    firstName: parsed.firstName ?? null,
    lastName: parsed.lastName ?? null,
    fullName,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    message: parsed.message ?? null,
    budgetMin: parsed.budgetMin ?? null,
    budgetMax: parsed.budgetMax ?? null,
    preferredLocation: parsed.preferredLocation ?? null,
    timeline: parsed.timeline ?? null,
    rawPayload: payload,
  };
}
