import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-accent" aria-hidden />
          Live AI voice bridge for global teams
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          AI-Powered Voice Bridge for{" "}
          <span className="text-gradient-signal">Seamless Global Communication</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Real-time translation, voice modulation, and sound tuning for businesses.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/call-studio">See the Call Studio</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
