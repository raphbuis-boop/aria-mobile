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

  const payload = await req.json();
  const appUrl = Deno.env.get("APP_URL");
  const secret =
    Deno.env.get("TRANSCRIPT_WEBHOOK_SECRET") ?? Deno.env.get("CRON_SECRET");

  if (!appUrl || !secret) {
    return Response.json(
      { error: "APP_URL and transcript secret must be set" },
      { status: 500 },
    );
  }

  const response = await fetch(`${appUrl}/api/webhooks/transcripts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return Response.json({
    forwarded: true,
    status: response.status,
    body: await response.json().catch(() => ({})),
  });
});
