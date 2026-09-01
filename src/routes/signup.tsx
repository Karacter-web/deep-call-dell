import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";

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
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-3xl font-bold">Start your free trial</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          100 call minutes a month. No card required.
        </p>
        <form
          className="panel-surface mt-8 space-y-4 rounded-2xl p-6"
          onSubmit={(e) => e.preventDefault()}
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
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Create account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Accounts aren't live yet — pick an auth provider and I'll wire this form up.
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Prefer to look around first?{" "}
          <Link to="/call-studio" className="text-primary hover:underline">
            Open the Call Studio
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
