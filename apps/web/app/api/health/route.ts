export async function GET() {
  return Response.json({
    ok: true,
    service: "aria-web",
    time: new Date().toISOString(),
  });
}
