import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Karacter Hub | Deep Call Live
        </p>
        <nav className="flex flex-wrap gap-6 text-sm">
          <Link to="/docs" className="text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <Link to="/api-reference" className="text-muted-foreground hover:text-foreground">
            API Reference
          </Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground">
            Contact
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
