import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    await navigate({ to: "/login", search: { redirect: undefined }, replace: true });
  }

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
        {loading ? null : user ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/call-studio">Open studio</Link>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/login" search={{ redirect: undefined }}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
