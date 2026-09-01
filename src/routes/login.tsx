import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Karacter Hub | Deep Call Live" },
      { name: "description", content: "Sign in to Karacter Hub and open your live call studio." },
      { property: "og:title", content: "Sign In — Karacter Hub | Deep Call Live" },
      { property: "og:description", content: "Sign in to Karacter Hub and open your live call studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const destination = redirect === "/call-studio" ? "/call-studio" : "/";
      void navigate({ to: destination });
    });
  }, [navigate, redirect]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await navigate({ to: redirect === "/call-studio" ? "/call-studio" : "/" });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your live call workspace."
      footer={<>New to Karacter Hub? <Link to="/signup" className="text-primary hover:underline">Create an account</Link></>}
    >
      <div className="space-y-4">
        <GoogleButton redirectPath="/login" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /><span>or sign in with email</span><span className="h-px flex-1 bg-border" />
        </div>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </AuthShell>
  );
}