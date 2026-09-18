import type {
  CONVERSATION_CHANNELS,
  CONTRACT_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  MEMORY_KINDS,
} from "./constants";

export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export type AgentUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  brokerage: string | null;
  timezone: string;
  twilioFromNumber: string | null;
  docusignAccountId: string | null;
};

export type Lead = {
  id: string;
  agentId: string;
  status: LeadStatus;
  source: LeadSource;
  fullName: string;
  email: string | null;
  phone: string | null;
  preferredLocation: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  qualifiedAt: string | null;
  createdAt: string;
};

export type PropertyRecord = {
  id: string;
  listingKey: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  livingAreaSqft: number | null;
  schoolDistrict: string | null;
  photoUrl: string | null;
};

export type ApprovalCard = {
  id: string;
  title: string;
  subtitle: string;
  status: ContractStatus;
  propertyAddress: string;
  buyerName: string;
  offerPrice: number | null;
};
