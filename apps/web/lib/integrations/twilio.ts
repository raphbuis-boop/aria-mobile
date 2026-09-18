import twilio from "twilio";
import { env } from "@/lib/env";

function client() {
  return twilio(env.twilioAccountSid(), env.twilioAuthToken());
}

export async function sendSms(input: {
  to: string;
  body: string;
  from?: string | null;
}) {
  const messagingServiceSid = env.twilioMessagingServiceSid();
  const from = input.from ?? env.twilioFromNumber();

  if (!messagingServiceSid && !from) {
    throw new Error("Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER");
  }

  return client().messages.create({
    to: input.to,
    body: input.body,
    ...(messagingServiceSid ? { messagingServiceSid } : { from }),
  });
}

export function voiceGatherTwiml(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Record maxLength="180" playBeep="true" />
</Response>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
