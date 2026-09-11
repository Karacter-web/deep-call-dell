import { createFileRoute } from "@tanstack/react-router";

/** Twilio call status callback: keeps call_sessions in sync. */
export const Route = createFileRoute("/api/public/twilio/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const expected = process.env["TWILIO_WEBHOOK_TOKEN"];
        if (!expected || url.searchParams.get("t") !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const params = new URLSearchParams(await request.text());
        const callSid = params.get("CallSid");
        const callStatus = params.get("CallStatus") ?? "completed";
        const ended = ["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus);
        const durationValue = params.get("CallDuration") ?? params.get("Duration");
        const duration = durationValue ? Number(durationValue) : null;
        const providerError = params.get("ErrorMessage") ?? params.get("ErrorCode");

        if (callSid) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("call_sessions")
            .update({
              status: ended ? "ended" : callStatus,
              ...(ended ? { ended_at: new Date().toISOString() } : {}),
              ...(duration !== null && Number.isFinite(duration)
                ? { duration_seconds: duration }
                : {}),
              ...(providerError ? { provider_error: providerError } : {}),
            })
            .eq("call_sid", callSid);
        }

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
          { headers: { "Content-Type": "application/xml" } },
        );
      },
    },
  },
});
