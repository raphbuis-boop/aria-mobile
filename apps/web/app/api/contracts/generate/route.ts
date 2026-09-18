import { contractGenerationRequestSchema } from "@aria/shared";
import { env } from "@/lib/env";
import { readJson, verifyBearerSecret } from "@/lib/http/security";
import { createClient } from "@/lib/supabase/server";
import { generateContract } from "@/lib/contracts/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { json } = await readJson<unknown>(request);
  const payload = contractGenerationRequestSchema.parse(json);

  const serviceCall = verifyBearerSecret(request, env.cronSecret());
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const agentId = payload.agentId ?? claims?.claims.sub;

  if (!serviceCall && !agentId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contract = await generateContract({
    ...payload,
    agentId: agentId as string | undefined,
  });

  return Response.json({ ok: true, contract }, { status: 201 });
}
