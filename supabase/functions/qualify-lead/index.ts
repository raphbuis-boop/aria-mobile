Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const payload = await req.json().catch(() => ({}));
  const leadId = payload.leadId ?? payload.record?.id;
  if (!leadId) {
    return Response.json({ error: "leadId required" }, { status: 400 });
  }

  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!appUrl || !cronSecret) {
    return Response.json(
      { error: "APP_URL and CRON_SECRET must be set" },
      { status: 500 },
    );
  }

  const response = await fetch(`${appUrl}/api/ai/qualify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ leadId }),
  });

  return Response.json({
    forwarded: true,
    status: response.status,
    body: await response.json().catch(() => ({})),
  });
});
