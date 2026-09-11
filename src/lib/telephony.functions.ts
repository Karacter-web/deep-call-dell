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

type TwilioIncomingNumber = {
  sid: string;
  phone_number: string;
  friendly_name: string | null;
  iso_country?: string;
  capabilities?: Record<string, boolean>;
};

function callbackUrls(base: string, token: string) {
  return {
    VoiceUrl: `${base}/api/public/twilio/voice?t=${token}`,
    VoiceMethod: "POST",
    SmsUrl: `${base}/api/public/twilio/sms?t=${token}`,
    SmsMethod: "POST",
    StatusCallback: `${base}/api/public/twilio/status?t=${token}`,
    StatusCallbackMethod: "POST",
  };
}

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
        ...callbackUrls(base, token),
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
    if (error) {
      await twilioRequest(`/IncomingPhoneNumbers/${bought.sid}.json`, { method: "DELETE" }).catch(() => {});
      throw new Error(error.message);
    }

    return { phoneNumber: bought.phone_number, sid: bought.sid };
  });

/** List the numbers owned by the signed-in user. */
export const listMyNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("phone_numbers")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Import this Twilio account's existing numbers and repair their webhook URLs. */
export const syncTwilioNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { twilioRequest, publicBaseUrl, webhookToken } = await import("@/lib/twilio.server");
    const base = publicBaseUrl();
    const token = encodeURIComponent(webhookToken());
    const inventory = await twilioRequest<{ incoming_phone_numbers?: TwilioIncomingNumber[] }>(
      "/IncomingPhoneNumbers.json",
      { query: { PageSize: "1000" } },
    );

    let imported = 0;
    let updated = 0;
    for (const number of inventory.incoming_phone_numbers ?? []) {
      await twilioRequest(`/IncomingPhoneNumbers/${number.sid}.json`, {
        method: "POST",
        form: callbackUrls(base, token),
      });

      const { data: ownRow, error: lookupError } = await context.supabase
        .from("phone_numbers")
        .select("id")
        .eq("user_id", context.userId)
        .eq("twilio_sid", number.sid)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);

      const record = {
        phone_number: number.phone_number,
        friendly_name: number.friendly_name,
        country: number.iso_country ?? "US",
        capabilities: number.capabilities ?? {},
        status: "active",
      };
      if (ownRow) {
        const { error } = await context.supabase
          .from("phone_numbers")
          .update(record)
          .eq("id", ownRow.id)
          .eq("user_id", context.userId);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const { error } = await context.supabase.from("phone_numbers").insert({
          ...record,
          user_id: context.userId,
          twilio_sid: number.sid,
        });
        if (error) {
          if (error.code === "23505") continue;
          throw new Error(error.message);
        }
        imported += 1;
      }
    }
    return { imported, updated, total: inventory.incoming_phone_numbers?.length ?? 0 };
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
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Number not found");

    if (row.twilio_sid) {
      const { twilioRequest } = await import("@/lib/twilio.server");
      await twilioRequest(`/IncomingPhoneNumbers/${row.twilio_sid}.json`, { method: "DELETE" });
    }
    const { error: deleteError } = await context.supabase
      .from("phone_numbers")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (deleteError) throw new Error(deleteError.message);
    return { ok: true };
  });

/** Place an outbound call from one of the user's numbers; audio streams to Call Studio. */
export const dialNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fromId: z.string().uuid(),
        to: z.string().min(5).max(20),
        sourceLang: z.string().min(2).max(5).default("en"),
        targetLang: z.string().min(2).max(5).default("es"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("phone_numbers")
      .select("id, phone_number")
      .eq("id", data.fromId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Number not found");

    const { twilioRequest, publicBaseUrl, webhookToken } = await import("@/lib/twilio.server");
    const base = publicBaseUrl();
    const token = encodeURIComponent(webhookToken());

    const call = await twilioRequest<{ sid: string; status?: string }>("/Calls.json", {
      method: "POST",
      form: {
        To: data.to,
        From: row.phone_number,
        Url: `${base}/api/public/twilio/outbound?t=${token}`,
        Method: "POST",
        StatusCallback: `${base}/api/public/twilio/status?t=${token}`,
        StatusCallbackMethod: "POST",
        MachineDetection: "Enable",
      },
    });

    const { data: session, error: saveError } = await context.supabase
      .from("call_sessions")
      .upsert(
        {
          call_sid: call.sid,
          user_id: context.userId,
          phone_number_id: row.id,
          from_number: row.phone_number,
          to_number: data.to,
          direction: "outbound",
          status: "connecting",
          source_lang: data.sourceLang,
          target_lang: data.targetLang,
        },
        { onConflict: "call_sid" },
      )
      .select("id")
      .single();
    if (saveError) throw new Error(saveError.message);

    return { sid: call.sid, sessionId: session.id };
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
      .eq("user_id", context.userId)
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
      .eq("user_id", context.userId)
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
      .select("id, phone_number")
      .eq("id", data.fromId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Number not found");

    const { twilioRequest, publicBaseUrl, webhookToken } = await import("@/lib/twilio.server");
    const sent = await twilioRequest<{ sid: string; status?: string }>("/Messages.json", {
      method: "POST",
      form: {
        From: row.phone_number,
        To: data.to,
        Body: data.body,
        StatusCallback: `${publicBaseUrl()}/api/public/twilio/sms?t=${encodeURIComponent(webhookToken())}&event=status`,
      },
    });
    const { error: saveError } = await context.supabase.from("sms_messages").insert({
      user_id: context.userId,
      phone_number_id: data.fromId,
      message_sid: sent.sid,
      direction: "outbound",
      from_number: row.phone_number,
      to_number: data.to,
      body: data.body,
      status: sent.status ?? "queued",
      sent_at: new Date().toISOString(),
    });
    if (saveError) throw new Error(saveError.message);
    return { sid: sent.sid };
  });

/** Load the signed-in user's call and SMS history. */
export const getCommunicationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [callsResult, messagesResult] = await Promise.all([
      context.supabase
        .from("call_sessions")
        .select("*, call_transcripts(*)")
        .eq("user_id", context.userId)
        .order("started_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("sms_messages")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (callsResult.error) throw new Error(callsResult.error.message);
    if (messagesResult.error) throw new Error(messagesResult.error.message);
    return { calls: callsResult.data ?? [], messages: messagesResult.data ?? [] };
  });
