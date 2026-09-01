import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content: "Setup guides for connecting Twilio, running the Deep Call Live backend and using the Call Studio.",
      },
      { property: "og:title", content: "Docs — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Setup guides for Twilio, the Deep Call Live backend and the Call Studio.",
      },
    ],
  }),
  component: () => (
    <PageShell title="Docs" intro="Get Deep Call Live running end to end.">
      <p>
        <strong className="text-foreground">1. Run the backend.</strong> The FastAPI service in
        <code className="mx-1 font-mono">backend/</code> handles speech-to-text, translation,
        text-to-speech and Twilio Media Streams. Start it with{" "}
        <code className="font-mono">docker compose up</code>.
      </p>
      <p>
        <strong className="text-foreground">2. Point Twilio at it.</strong> Set your number's voice
        webhook to <code className="font-mono">/twilio/incoming-call</code> on your public backend
        URL. Twilio then opens a Media Stream to{" "}
        <code className="font-mono">/twilio/stream-audio</code>.
      </p>
      <p>
        <strong className="text-foreground">3. Open the Call Studio.</strong> The studio subscribes
        to the live socket stream and shows incoming and translated text side by side, with
        translation and sound tuning toggles.
      </p>
      <p>
        <strong className="text-foreground">4. Configure keys.</strong> Copy{" "}
        <code className="font-mono">.env.example</code> and fill in your Twilio, translation and
        speech provider credentials.
      </p>
    </PageShell>
  ),
});
