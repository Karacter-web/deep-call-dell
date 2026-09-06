import { createFileRoute } from "@tanstack/react-router";

/** Twilio inbound SMS webhook. Verifies the shared token and acknowledges. */
export const Route = createFileRoute("/api/public/twilio/sms")({
  server: {
    handlers: {
      POST: async ({ request }) => handleSms(request),
    },
  },
});

async function handleSms(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const expected = process.env["TWILIO_WEBHOOK_TOKEN"];
  if (!expected || url.searchParams.get("t") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(await request.text());
  } catch {
    params = url.searchParams;
  }
  console.log(`Inbound SMS from ${params.get("From") ?? "unknown"}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks — Karacter Hub received your message and will reply shortly.</Message></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
