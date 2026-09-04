import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, PhoneCall, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listMyNumbers,
  purchaseNumber,
  releaseNumber,
  searchNumbers,
  type AvailableNumber,
} from "@/lib/telephony.functions";

export const Route = createFileRoute("/_authenticated/numbers")({
  head: () => ({
    meta: [
      { title: "Phone Numbers — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content:
          "Search and buy a phone number, then take live calls with real-time transcription and translation.",
      },
      { property: "og:title", content: "Phone Numbers — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Buy a business number and route live calls straight into Call Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NumbersPage,
});

const COUNTRIES = ["US", "CA", "GB", "AU", "NG", "DE", "FR", "ES"];

function NumbersPage() {
  const queryClient = useQueryClient();
  const fetchMine = useServerFn(listMyNumbers);
  const search = useServerFn(searchNumbers);
  const buy = useServerFn(purchaseNumber);
  const release = useServerFn(releaseNumber);

  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<AvailableNumber[] | null>(null);

  const mine = useQuery({ queryKey: ["my-numbers"], queryFn: () => fetchMine({}) });

  const searchMutation = useMutation({
    mutationFn: () =>
      search({ data: { country, areaCode: areaCode.trim() || undefined } }),
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.info("No numbers matched — try another area code.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const buyMutation = useMutation({
    mutationFn: (phoneNumber: string) => buy({ data: { phoneNumber, country } }),
    onSuccess: (data) => {
      toast.success(`${data.phoneNumber} is yours — calls now land in Call Studio.`);
      setResults((r) => r?.filter((n) => n.phoneNumber !== data.phoneNumber) ?? null);
      void queryClient.invalidateQueries({ queryKey: ["my-numbers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => release({ data: { id } }),
    onSuccess: () => {
      toast.success("Number released");
      void queryClient.invalidateQueries({ queryKey: ["my-numbers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            <span className="text-gradient-signal">Phone numbers</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy a number, share it with your customers, and every inbound call streams into Call
            Studio with live transcription and translation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/call-studio">
            <PhoneCall className="h-4 w-4" /> Open Call Studio
          </Link>
        </Button>
      </header>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Your numbers</h2>
        {mine.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : mine.data && mine.data.length > 0 ? (
          <ul className="mt-4 grid gap-3">
            {mine.data.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-mono text-base">{n.phone_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.friendly_name ?? "Karacter Hub"} · {n.country}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{n.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Release ${n.phone_number}`}
                    disabled={releaseMutation.isPending}
                    onClick={() => releaseMutation.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No numbers yet — search below to get your first one.
          </p>
        )}
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Find a number</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            searchMutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="country" className="text-xs text-muted-foreground">
              Country
            </Label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="area" className="text-xs text-muted-foreground">
              Area code (optional)
            </Label>
            <Input
              id="area"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="415"
              className="w-32"
            />
          </div>
          <Button type="submit" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </form>

        {results && results.length > 0 ? (
          <ul className="mt-5 grid gap-3">
            {results.map((n) => (
              <li
                key={n.phoneNumber}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-mono text-base">{n.friendlyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[n.locality, n.region, n.isoCountry].filter(Boolean).join(", ")}
                  </p>
                </div>
                <Button
                  onClick={() => buyMutation.mutate(n.phoneNumber)}
                  disabled={buyMutation.isPending}
                >
                  <Phone className="h-4 w-4" /> Buy
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
