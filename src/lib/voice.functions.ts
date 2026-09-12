import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Short, natural sample lines used when the user hasn't typed their own. */
export const SAMPLE_LINES: Record<string, string> = {
  en: "Hi, thanks for calling Karacter Hub — how can I help you today?",
  es: "Hola, gracias por llamar a Karacter Hub. ¿En qué puedo ayudarle hoy?",
  fr: "Bonjour, merci d'appeler Karacter Hub. Comment puis-je vous aider ?",
  de: "Hallo, danke für Ihren Anruf bei Karacter Hub. Wie kann ich helfen?",
  pt: "Olá, obrigado por ligar para a Karacter Hub. Como posso ajudar hoje?",
  tr: "Merhaba, Karacter Hub'ı aradığınız için teşekkürler. Size nasıl yardımcı olabilirim?",
  ar: "مرحباً، شكراً لاتصالك بـ Karacter Hub. كيف يمكنني مساعدتك اليوم؟",
  yo: "Pẹlẹ o, ẹ ṣeun fun pipe Karacter Hub. Báwo ni mo ṣe lè ràn yín lọ́wọ́?",
  ha: "Sannu, na gode da kiran Karacter Hub. Ta yaya zan taimaka maka yau?",
  ig: "Ndewo, daalụ maka ịkpọ Karacter Hub. Kedu ka m ga-esi nyere gị aka?",
};

const OPENAI_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  tr: "Turkish",
  ar: "Arabic",
  yo: "Yoruba",
  ha: "Hausa",
  ig: "Igbo",
};

function pickVoice(voiceId: string | null | undefined, gender: string): string {
  if (voiceId && OPENAI_VOICES.includes(voiceId)) return voiceId;
  if (gender === "male") return "onyx";
  if (gender === "female") return "coral";
  return "alloy";
}

function buildInstructions(input: {
  language: string;
  gender: string;
  style: string;
  stability: number;
  similarity: number;
  pitch: number;
  description?: string | null | undefined;
}) {
  const language = LANGUAGE_NAMES[input.language] ?? input.language;
  const expressive = input.stability < 0.45;
  const steady = input.stability > 0.7;
  const pitch =
    input.pitch > 2 ? "a slightly brighter, higher pitch" : input.pitch < -2 ? "a deeper, lower pitch" : "a natural pitch";

  return [
    `Speak entirely in ${language} like a real human on a phone call, never like a text-to-speech reader.`,
    `Tone: ${input.style}. Voice character: ${input.gender}.`,
    `Use ${pitch}, natural breaths, small pauses at commas, and everyday intonation.`,
    expressive ? "Be lively and expressive, with varied intonation." : "",
    steady ? "Keep the delivery even and consistent throughout." : "",
    input.description ? `Additional direction: ${input.description}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const previewSchema = z.object({
  text: z.string().max(600).optional(),
  language: z.string().min(2).max(5).default("en"),
  gender: z.string().max(20).default("neutral"),
  style: z.string().max(30).default("conversational"),
  providerVoiceId: z.string().max(60).nullable().optional(),
  description: z.string().max(400).nullable().optional(),
  stability: z.number().min(0).max(1).default(0.5),
  similarity: z.number().min(0).max(1).default(0.75),
  speed: z.number().min(0.5).max(1.5).default(1),
  pitch: z.number().min(-10).max(10).default(0),
});

/** Generate a short, lifelike spoken sample of a voice model. */
export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => previewSchema.parse(input))
  .handler(async ({ data }): Promise<{ audio: string; text: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Voice preview is not configured yet.");

    const text = (data.text?.trim() || SAMPLE_LINES[data.language] || SAMPLE_LINES["en"]) as string;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice: pickVoice(data.providerVoiceId, data.gender),
        instructions: buildInstructions(data),
        speed: data.speed,
        response_format: "mp3",
        stream_format: "audio",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Voice preview failed [${res.status}]: ${body}`);
      if (res.status === 429) throw new Error("Too many previews right now — try again in a moment.");
      if (res.status === 402) throw new Error("Voice preview needs more AI credits on this workspace.");
      throw new Error(`Voice preview failed (${res.status}).`);
    }

    const audio = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { audio, text };
  });
