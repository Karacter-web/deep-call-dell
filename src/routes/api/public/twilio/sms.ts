import { createFileRoute } from "@tanstack/react-router";

/** Twilio SMS webhook. Stores inbound messages and delivery updates. */
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
  const messageSid = params.get("MessageSid") ?? params.get("SmsSid");
  const status = params.get("MessageStatus") ?? params.get("SmsStatus");
  const isStatus = url.searchParams.get("event") === "status";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (isStatus && messageSid) {
    const delivered = status === "delivered" || status === "read";
    await supabaseAdmin
      .from("sms_messages")
      .update({
        status: status ?? "unknown",
        error_code: params.get("ErrorCode"),
        error_message: params.get("ErrorMessage"),
        ...(delivered ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq("message_sid", messageSid);
    return new Response("ok");
  }

  const from = params.get("From");
  const to = params.get("To");
  const body = params.get("Body");
  if (from && to && body) {
    const { data: number } = await supabaseAdmin
      .from("phone_numbers")
      .select("id, user_id")
      .eq("phone_number", to)
      .maybeSingle();
    if (number) {
      await supabaseAdmin.from("sms_messages").upsert(
        {
          user_id: number.user_id,
          phone_number_id: number.id,
          message_sid: messageSid,
          direction: "inbound",
          from_number: from,
          to_number: to,
          body,
          status: status ?? "received",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "message_sid" },
      );
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
