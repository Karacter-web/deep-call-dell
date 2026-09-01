import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Start Free Trial — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content: "Create your Karacter Hub account and get 100 free call minutes a month of AI translation and sound tuning.",
      },
      { property: "og:title", content: "Start Free Trial — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Create your account and get 100 free call minutes a month.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/call-studio";
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("name") ?? "").trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setCreated(true);
      return;
    }
    window.location.href = "/call-studio";
  }

  if (created) {
    return (
      <AuthShell title="Check your inbox" subtitle="One more step before you enter the studio.">
        <p className="text-sm leading-6 text-muted-foreground">
          We sent a confirmation link to your email address. Confirm it, then return here to sign in.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" search={{ redirect: undefined }} className="text-primary hover:underline">Go to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Start your free trial"
      subtitle="100 call minutes a month. No card required."
      footer={<>Already have an account? <Link to="/login" search={{ redirect: undefined }} className="text-primary hover:underline">Sign in</Link></>}
    >
      <div className="space-y-4">
        <GoogleButton label="Sign up with Google" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Ada Nwosu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
