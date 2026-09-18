import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  extractedClientFactsSchema,
  qualificationIntentSchema,
  type ExtractedClientFacts,
  type QualificationIntent,
} from "@aria/shared";
import { env } from "@/lib/env";

function model() {
  return anthropic(env.anthropicModel());
}

export async function draftQualificationSms(input: {
  agentName: string;
  leadName: string;
  source: string;
  listingHint?: string | null;
  location?: string | null;
  message?: string | null;
}): Promise<QualificationIntent> {
  const { output } = await generateText({
    model: model(),
    instructions: [
      "You write SMS for a solo real-estate agent.",
      "Voice: warm, specific, unhurried. No slang, no emoji, no exclamation marks.",
      "Stay under 320 characters. Ask exactly one qualifying question.",
      "Never claim a showing is booked. Never invent inventory.",
    ].join(" "),
    prompt: JSON.stringify(input),
    output: Output.object({ schema: qualificationIntentSchema }),
  });

  if (!output) {
    throw new Error("Claude returned an empty qualification payload");
  }
  return output;
}

export async function extractClientFacts(
  transcript: string,
): Promise<ExtractedClientFacts> {
  const { output } = await generateText({
    model: model(),
    instructions: [
      "Extract durable facts about a real-estate client from a call or SMS transcript.",
      "Do not invent numbers. Use null when unknown.",
      "Memories should be atomic, written in third person, and useful for future matching.",
    ].join(" "),
    prompt: transcript,
    output: Output.object({ schema: extractedClientFactsSchema }),
  });

  if (!output) {
    throw new Error("Claude returned an empty transcript parse");
  }
  return output;
}

export async function summarizeContractForApproval(input: {
  buyerName: string;
  propertyAddress: string;
  listPrice: number | null;
  offerPrice: number | null;
  closingDate: string | null;
}): Promise<string> {
  const { text } = await generateText({
    model: model(),
    instructions:
      "Write a 3-sentence approval brief for a listing agent. Plain language. No legal advice.",
    prompt: JSON.stringify(input),
  });
  return text.trim();
}
