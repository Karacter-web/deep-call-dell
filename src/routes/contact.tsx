import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content: "Talk to the Karacter Hub team about enterprise call volumes, custom languages and deployment.",
      },
      { property: "og:title", content: "Contact — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Talk to us about enterprise call volumes, custom languages and deployment.",
      },
    ],
  }),
  component: () => (
    <PageShell title="Contact" intro="We reply to every message within one business day.">
      <p>
        Sales and enterprise:{" "}
        <a className="text-primary hover:underline" href="mailto:sales@karacterhub.com">
          sales@karacterhub.com
        </a>
      </p>
      <p>
        Support:{" "}
        <a className="text-primary hover:underline" href="mailto:support@karacterhub.com">
          support@karacterhub.com
        </a>
      </p>
    </PageShell>
  ),
});
