import { createFileRoute } from "@tanstack/react-router";

/**
 * TwiML for outbound calls placed from the app. Runs once the dialed party
 * answers: starts real-time transcription (which streams into Call Studio)
 * and holds the line open so the agent can speak back.
 */
export const Route = createFileRoute("/api/public/twilio/outbound")({
  server: {
    handlers: {
      POST: async ({ request }) => handleOutbound(request),
      GET: async ({ request }) => handleOutbound(request),
    },
  },
});

async function handleOutbound(request: Request): Promise<Response> {
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

  const callSid = params.get("CallSid") ?? "";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let sourceLang = "en";
  if (callSid) {
    const { data: session } = await supabaseAdmin
      .from("call_sessions")
      .select("source_lang")
      .eq("call_sid", callSid)
      .maybeSingle();
    if (session?.source_lang) sourceLang = session.source_lang;
    await supabaseAdmin
      .from("call_sessions")
      .update({ status: "active" })
      .eq("call_sid", callSid);
  }

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
  <Pause length="600" />
  <Redirect method="POST">${statusUrl}&amp;event=timeout</Redirect>
</Response>`;

  return new Response(twiml, { headers: { "Content-Type": "application/xml" } });
}
