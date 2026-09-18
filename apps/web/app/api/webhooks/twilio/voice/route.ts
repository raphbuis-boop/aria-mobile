import { voiceGatherTwiml } from "@/lib/integrations/twilio";

export async function POST() {
  return new Response(
    voiceGatherTwiml(
      "This is Aria for your agent. After the tone, share your budget, neighborhood, and timing.",
    ),
    { headers: { "Content-Type": "text/xml" } },
  );
}
