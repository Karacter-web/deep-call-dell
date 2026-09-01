import { createFileRoute } from "@tanstack/react-router";

/**
 * Twilio voice webhook. Answers an inbound call, opens a call session and
 * starts Twilio real-time transcription which posts to /api/public/twilio/transcription.
 */
export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => handleVoice(request),
      GET: async ({ request }) => handleVoice(request),
    },
  },
});

async function handleVoice(request: Request): Promise<Response> {
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

  const callSid = params.get("CallSid") ?? `unknown-${Date.now()}`;
  const from = params.get("From");
  const to = params.get("To");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let sourceLang = "en";
  let targetLang = "es";

  const { data: number } = await supabaseAdmin
    .from("phone_numbers")
    .select("id, user_id")
    .eq("phone_number", to ?? "")
    .maybeSingle();

  await supabaseAdmin.from("call_sessions").upsert(
    {
      call_sid: callSid,
      user_id: number?.user_id ?? null,
      phone_number_id: number?.id ?? null,
      from_number: from,
      to_number: to,
      direction: "inbound",
      status: "active",
      source_lang: sourceLang,
      target_lang: targetLang,
    },
    { onConflict: "call_sid" },
  );

  const base = `${url.protocol}//${url.host}`;
  const transcriptionUrl = `${base}/api/public/twilio/transcription?t=${encodeURIComponent(expected)}`;
  const statusUrl = `${base}/api/public/twilio/status?t=${encodeURIComponent(expected)}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Transcription
      statusCallbackUrl="${transcriptionUrl}"
      track="both_tracks"
      partialResults="true"
      languageCode="${sourceLang}-US"
      transcriptionEngine="google" />
  </Start>
  <Say language="en-US">Connecting you to Karacter Hub Deep Call Live.</Say>
  <Pause length="600" />
  <Redirect method="POST">${statusUrl}&amp;event=timeout</Redirect>
</Response>`;

  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
