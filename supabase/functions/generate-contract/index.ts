Deno.serve(async (req) => {
  const payload = await req.json();
  const appUrl = Deno.env.get("APP_URL");
  const secret = Deno.env.get("CRON_SECRET");

  if (!appUrl || !secret) {
    return Response.json(
      { error: "APP_URL and CRON_SECRET must be set" },
      { status: 500 },
    );
  }

  const response = await fetch(`${appUrl}/api/contracts/generate`, {
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
