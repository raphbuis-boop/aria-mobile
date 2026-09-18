import { after } from "next/server";
import { env } from "@/lib/env";
import { readJson, verifyBearerSecret, verifyHmacSha256 } from "@/lib/http/security";
import { normalizeInboundLead } from "@/lib/leads/normalize";
import { ingestNormalizedLead, qualifyLead } from "@/lib/leads/qualify";

function authorize(request: Request, rawBody: string, sourceHint?: string) {
  const cronOk = verifyBearerSecret(request, env.cronSecret());
  if (cronOk) return true;

  if (sourceHint === "meta") {
    const signature = request.headers.get("x-hub-signature-256");
    const secret = env.metaAppSecret();
    return Boolean(
      signature && secret && verifyHmacSha256(rawBody, signature, secret),
    );
  }

  if (sourceHint === "zillow") {
    return verifyBearerSecret(
      request,
      env.zillowWebhookSecret() ?? env.leadWebhookSecret(),
    );
  }

  if (sourceHint === "realtor") {
    return verifyBearerSecret(
      request,
      env.realtorWebhookSecret() ?? env.leadWebhookSecret(),
    );
  }

  return verifyBearerSecret(request, env.leadWebhookSecret());
}

export async function handleLeadWebhook(request: Request, sourceHint?: string) {
  const { raw, json } = await readJson<unknown>(request);

  if (!authorize(request, raw, sourceHint)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? env.defaultAgentId();

  const lead = normalizeInboundLead(json, {
    sourceHint,
    agentId: agentId ?? undefined,
  });

  const ingested = await ingestNormalizedLead(lead);
  if (ingested.duplicate) {
    return Response.json({ ok: true, duplicate: true });
  }

  const leadId = ingested.leadId;
  after(async () => {
    if (!leadId) return;
    try {
      await qualifyLead(leadId);
    } catch (error) {
      console.error("Qualification worker failed", error);
    }
  });

  return Response.json(
    { ok: true, leadId, qualification: "queued" },
    { status: 202 },
  );
}
