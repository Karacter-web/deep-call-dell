import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a New Password — Karacter Hub | Deep Call Live" },
      { name: "description", content: "Choose a new secure password for your Karacter Hub account." },
      { property: "og:title", content: "Choose a New Password — Karacter Hub | Deep Call Live" },
      { property: "og:description", content: "Choose a new secure password for your Karacter Hub account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    if (!isRecovery) {
      toast.error("This password reset link is invalid or has expired.");
      return;
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      toast.error("The passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUpdated(true);
    await supabase.auth.signOut();
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it unique to keep your call workspace secure." footer={<>Remembered it? <Link to="/login" search={{ redirect: undefined }} className="text-primary hover:underline">Back to sign in</Link></>}>
      {updated ? (
        <div className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>Your password has been updated. You can now sign in with your new password.</p>
          <Button type="button" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => void navigate({ to: "/login", search: { redirect: undefined } })}>Continue to sign in</Button>
        </div>
      ) : !ready ? (
        <p className="text-sm leading-6 text-muted-foreground">Open this page from the password reset email to continue.</p>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} /></div>
          <div className="space-y-2"><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={8} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">{busy ? "Updating…" : "Update password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}