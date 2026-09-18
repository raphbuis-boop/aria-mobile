import { handleLeadWebhook } from "@/lib/leads/webhook-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleLeadWebhook(request, "zillow");
}
