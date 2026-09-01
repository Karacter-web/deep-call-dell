import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Karacter Hub | Deep Call Live" },
      { name: "description", content: "Request a secure password reset link for Karacter Hub." },
      { property: "og:title", content: "Reset Password — Karacter Hub | Deep Call Live" },
      { property: "og:description", content: "Request a secure password reset link for Karacter Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? ""), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a secure link to choose a new one." footer={<>Remembered it? <Link to="/login" search={{ redirect: undefined }} className="text-primary hover:underline">Back to sign in</Link></>}>
      {sent ? (
        <p className="text-sm leading-6 text-muted-foreground">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</p>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
          <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}