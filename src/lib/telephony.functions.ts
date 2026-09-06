import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  isoCountry: string;
  capabilities: { voice?: boolean; SMS?: boolean; MMS?: boolean };
};

const searchSchema = z.object({
  country: z.string().min(2).max(2).default("US"),
  areaCode: z.string().max(6).optional(),
  contains: z.string().max(20).optional(),
  smsEnabled: z.boolean().default(false),
});

/** Search Twilio for buyable local numbers. */
export const searchNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<AvailableNumber[]> => {
    const { twilioRequest } = await import("@/lib/twilio.server");
    const query: Record<string, string> = { PageSize: "20", VoiceEnabled: "true" };
    if (data.smsEnabled) query["SmsEnabled"] = "true";
    if (data.areaCode) query["AreaCode"] = data.areaCode;
    if (data.contains) query["Contains"] = data.contains;

    const res = await twilioRequest<{
      available_phone_numbers: Array<{
        phone_number: string;
        friendly_name: string;
        locality: string | null;
        region: string | null;
        iso_country: string;
        capabilities: Record<string, boolean>;
      }>;
    }>(`/AvailablePhoneNumbers/${data.country.toUpperCase()}/Local.json`, { query });

    return (res.available_phone_numbers ?? []).map((n) => ({
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      locality: n.locality,
      region: n.region,
      isoCountry: n.iso_country,
      capabilities: n.capabilities as AvailableNumber["capabilities"],
    }));
  });

const purchaseSchema = z.object({
  phoneNumber: z.string().min(5).max(20),
  friendlyName: z.string().max(60).optional(),
  country: z.string().min(2).max(2).default("US"),
});

/** Buy a number on Twilio and point it at this app's call webhooks. */
export const purchaseNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => purchaseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { twilioRequest, publicBaseUrl, webhookToken } = await import("@/lib/twilio.server");
    const base = publicBaseUrl();
    const token = encodeURIComponent(webhookToken());

    const bought = await twilioRequest<{
      sid: string;
      phone_number: string;
      friendly_name: string;
      capabilities: Record<string, boolean>;
    }>("/IncomingPhoneNumbers.json", {
      method: "POST",
      form: {
        PhoneNumber: data.phoneNumber,
        FriendlyName: data.friendlyName ?? "Karacter Hub | Deep Call Live",
        VoiceUrl: `${base}/api/public/twilio/voice?t=${token}`,
        VoiceMethod: "POST",
        SmsUrl: `${base}/api/public/twilio/sms?t=${token}`,
        SmsMethod: "POST",
        StatusCallback: `${base}/api/public/twilio/status?t=${token}`,
        StatusCallbackMethod: "POST",
      },
    });

    const { error } = await context.supabase.from("phone_numbers").insert({
      user_id: context.userId,
      phone_number: bought.phone_number,
      friendly_name: bought.friendly_name,
      country: data.country.toUpperCase(),
      twilio_sid: bought.sid,
      capabilities: bought.capabilities ?? {},
      status: "active",
    });
    if (error) throw new Error(error.message);

    return { phoneNumber: bought.phone_number, sid: bought.sid };
  });

/** List the numbers owned by the signed-in user. */
export const listMyNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("phone_numbers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Release a number back to Twilio and remove it from the account. */
export const releaseNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("phone_numbers")
      .select("id, twilio_sid")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Number not found");

    if (row.twilio_sid) {
      const { twilioRequest } = await import("@/lib/twilio.server");
      await twilioRequest(`/IncomingPhoneNumbers/${row.twilio_sid}.json`, { method: "DELETE" });
    }
    await context.supabase.from("phone_numbers").delete().eq("id", data.id);
    return { ok: true };
  });

/** Speak text (optionally translated) into the caller's live call. */
export const speakToCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        text: z.string().min(1).max(1000),
        translate: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("call_sessions")
      .select("id, call_sid, source_lang, target_lang, status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Call not found");

    const { twilioRequest, translateText, sayLocale, escapeXml, publicBaseUrl, webhookToken } =
      await import("@/lib/twilio.server");

    const spoken = data.translate
      ? (await translateText(data.text, session.target_lang, session.source_lang)) || data.text
      : data.text;
    const lang = data.translate ? session.target_lang : session.source_lang;
    const statusUrl = `${publicBaseUrl()}/api/public/twilio/status?t=${encodeURIComponent(webhookToken())}&event=timeout`;

    const twiml = `<Response><Say language="${sayLocale(lang)}">${escapeXml(spoken)}</Say><Pause length="600"/><Redirect method="POST">${escapeXml(statusUrl)}</Redirect></Response>`;

    await twilioRequest(`/Calls/${session.call_sid}.json`, {
      method: "POST",
      form: { Twiml: twiml },
    });

    await context.supabase.from("call_transcripts").insert({
      session_id: session.id,
      user_id: context.userId,
      speaker: "agent",
      text: data.text,
      translated_text: data.translate ? spoken : null,
      is_final: true,
      sequence: Math.floor(Date.now() / 1000),
    });

    return { spoken };
  });

/** End a live call. */
export const hangUpCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: session } = await context.supabase
      .from("call_sessions")
      .select("id, call_sid")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Call not found");

    const { twilioRequest } = await import("@/lib/twilio.server");
    await twilioRequest(`/Calls/${session.call_sid}.json`, {
      method: "POST",
      form: { Status: "completed" },
    });
    await context.supabase
      .from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session.id);
    return { ok: true };
  });

/** Send an SMS from one of the user's own numbers. */
export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fromId: z.string().uuid(),
        to: z.string().min(5).max(20),
        body: z.string().min(1).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("phone_numbers")
      .select("phone_number")
      .eq("id", data.fromId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Number not found");

    const { twilioRequest } = await import("@/lib/twilio.server");
    const sent = await twilioRequest<{ sid: string }>("/Messages.json", {
      method: "POST",
      form: { From: row.phone_number, To: data.to, Body: data.body },
    });
    return { sid: sent.sid };
  });
