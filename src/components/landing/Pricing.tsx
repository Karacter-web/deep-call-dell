import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["100 call minutes/month", "2 languages", "Live transcription", "Community support"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    features: [
      "2,000 call minutes/month",
      "All 9 languages",
      "Sound tuning & voice modulation",
      "Call history & exports",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited minutes", "Dedicated Twilio routing", "SSO & role management", "24/7 SLA support"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold md:text-4xl">Pricing</h2>
        <p className="mt-3 text-muted-foreground">Start free. Scale when the calls do.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`panel-surface rounded-2xl p-6 ${t.highlighted ? "ring-2 ring-accent" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t.name}</h3>
                {t.highlighted && (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-4 font-display text-4xl font-bold">
                {t.price}
                <span className="text-base font-normal text-muted-foreground">{t.period}</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-6 w-full ${t.highlighted ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                variant={t.highlighted ? "default" : "outline"}
              >
                <Link to={t.name === "Enterprise" ? "/contact" : "/signup"}>{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
