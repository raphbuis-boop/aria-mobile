import { transcriptWebhookSchema } from "@aria/shared";
import { env } from "@/lib/env";
import { readJson, verifyBearerSecret } from "@/lib/http/security";
import { ingestTranscript } from "@/lib/memory/ingest-transcript";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { json } = await readJson<unknown>(request);
  const authorized =
    verifyBearerSecret(request, env.transcriptWebhookSecret()) ||
    verifyBearerSecret(request, env.cronSecret());

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = transcriptWebhookSchema.parse(json);
  const result = await ingestTranscript(payload);
  return Response.json({ ok: true, ...result });
}
