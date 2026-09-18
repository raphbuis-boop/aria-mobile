import { env } from "@/lib/env";
import { readJson, verifyBearerSecret } from "@/lib/http/security";
import { createClient } from "@/lib/supabase/server";
import { approveContract } from "@/lib/contracts/generate";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { json } = await readJson<{ note?: string }>(request);

  const serviceCall = verifyBearerSecret(request, env.cronSecret());
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!serviceCall && !claims?.claims.sub) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contract = await approveContract(id, json.note);
  return Response.json({ ok: true, contract });
}
