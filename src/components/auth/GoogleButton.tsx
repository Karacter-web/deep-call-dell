import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export function GoogleButton({
  label = "Continue with Google",
  redirectPath = "/login",
}: {
  label?: string;
  redirectPath?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirectPath}`,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    window.location.href = "/call-studio";
  }

  return (
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={handleClick}>
      {label}
    </Button>
  );
}
