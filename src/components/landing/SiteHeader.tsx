import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="font-display text-lg font-bold">
          <span className="text-gradient-signal">Karacter Hub</span>
          <span className="text-muted-foreground"> | Deep Call Live</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-muted-foreground hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
            How it works
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </a>
          <Link to="/call-studio" className="text-muted-foreground hover:text-foreground">
            Call Studio
          </Link>
        </nav>
        <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/signup">Start Free Trial</Link>
        </Button>
      </div>
    </header>
  );
}
