import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content: "How Karacter Hub handles call audio, transcripts and account data.",
      },
      { property: "og:title", content: "Privacy Policy — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "How we handle call audio, transcripts and account data.",
      },
    ],
  }),
  component: () => (
    <PageShell title="Privacy Policy" intro="Last updated: today.">
      <p>
        <strong className="text-foreground">Call audio.</strong> Audio is processed in memory to
        produce transcripts and translations. Recordings are not stored unless you explicitly
        enable call archiving.
      </p>
      <p>
        <strong className="text-foreground">Transcripts.</strong> Transcripts are tied to your
        account and retained for the period configured on your plan.
      </p>
      <p>
        <strong className="text-foreground">Account data.</strong> We store your email and
        organisation details to operate the service. We do not sell personal data.
      </p>
      <p>
        <strong className="text-foreground">Subprocessors.</strong> Telephony, speech and
        translation providers process data on our behalf under contract.
      </p>
    </PageShell>
  ),
});
