import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

const ENDPOINTS = [
  { method: "POST", path: "/stt", body: "Audio upload → transcript text." },
  { method: "POST", path: "/translate", body: "Text + source/target language → translated text." },
  { method: "POST", path: "/tts", body: "Text + voice → synthesized audio." },
  { method: "POST", path: "/twilio/incoming-call", body: "TwiML webhook for inbound calls." },
  { method: "WS", path: "/twilio/stream-audio", body: "Twilio Media Stream audio socket." },
  { method: "WS", path: "/socket.io", body: "Studio events: transcript, translation, call status." },
];

export const Route = createFileRoute("/api-reference")({
  head: () => ({
    meta: [
      { title: "API Reference — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content: "HTTP and WebSocket endpoints for speech-to-text, translation, text-to-speech and Twilio streaming.",
      },
      { property: "og:title", content: "API Reference — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Endpoints for STT, translation, TTS and Twilio media streaming.",
      },
    ],
  }),
  component: () => (
    <PageShell title="API Reference" intro="Endpoints exposed by the Deep Call Live backend.">
      <ul className="space-y-3">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="panel-surface rounded-xl p-4">
            <p className="font-mono text-xs text-primary">
              {e.method} <span className="text-foreground">{e.path}</span>
            </p>
            <p className="mt-1">{e.body}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  ),
});
