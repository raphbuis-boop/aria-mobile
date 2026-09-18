import { handleLeadWebhook } from "@/lib/leads/webhook-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleLeadWebhook(request);
}
