import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karacter Hub | AI Voice Bridge for Global Calls" },
      {
        name: "description",
        content:
          "Real-time translation, voice modulation and sound tuning for business phone calls. Start free with 100 call minutes a month.",
      },
      { property: "og:title", content: "Karacter Hub | AI Voice Bridge for Global Calls" },
      {
        property: "og:description",
        content:
          "Real-time translation, voice modulation and sound tuning for business phone calls.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
