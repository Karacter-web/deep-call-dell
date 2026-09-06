/**
 * Server-only helpers for calling Twilio through the Lovable connector gateway.
 * Never import this from client code.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export function twilioHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!twilioKey) throw new Error("TWILIO_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": twilioKey,
  };
}

/** Call a Twilio REST endpoint. Body is form-encoded, as Twilio requires. */
export async function twilioRequest<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; form?: Record<string, string>; query?: Record<string, string> } = {},
): Promise<T> {
  const { method = "GET", form, query } = options;
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const response = await fetch(`${GATEWAY_URL}${path}${qs}`, {
    method,
    headers: {
      ...twilioHeaders(),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Twilio request failed [${response.status}] ${path}: ${errorBody}`);
    throw new Error(`Twilio request failed [${response.status}]: ${errorBody}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Public base URL Twilio should call back on. */
export function publicBaseUrl(): string {
  return (
    process.env["PUBLIC_BASE_URL"] ?? "https://deep-call-flow.vercel.app"
  );
}

export function webhookToken(): string {
  const token = process.env["TWILIO_WEBHOOK_TOKEN"];
  if (!token) throw new Error("TWILIO_WEBHOOK_TOKEN is not configured");
  return token;
}

/** Translate text with the Lovable AI gateway. Returns '' on failure. */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !text.trim()) return "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a live phone-call interpreter. Translate the user's message${
              sourceLang ? ` from ${sourceLang}` : ""
            } into ${targetLang}. Reply with the translation only, no notes or quotes.`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`Translation failed [${res.status}]: ${await res.text()}`);
      return "";
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    console.error("Translation error", error);
    return "";
  }
}

const SAY_LOCALES: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ar: "ar-XA",
  yo: "en-US",
  ha: "en-US",
  ig: "en-US",
};

export function sayLocale(lang: string): string {
  return SAY_LOCALES[lang] ?? "en-US";
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
