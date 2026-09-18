import { env } from "@/lib/env";
import { readJson, verifyBearerSecret } from "@/lib/http/security";
import { qualifyLead } from "@/lib/leads/qualify";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!verifyBearerSecret(request, env.cronSecret())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { json } = await readJson<{ leadId?: string }>(request);
  if (!json.leadId) {
    return Response.json({ error: "leadId required" }, { status: 400 });
  }

  const result = await qualifyLead(json.leadId);
  return Response.json({ ok: true, ...result });
}
