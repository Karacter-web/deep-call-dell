import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, MessageSquare, Mic2, Phone, PhoneCall, RefreshCw, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  dialNumber,
  listMyNumbers,
  sendSms,
  purchaseNumber,
  releaseNumber,
  searchNumbers,
  syncTwilioNumbers,
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

const CALL_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
];

function NumbersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchMine = useServerFn(listMyNumbers);
  const search = useServerFn(searchNumbers);
  const buy = useServerFn(purchaseNumber);
  const release = useServerFn(releaseNumber);
  const sms = useServerFn(sendSms);
  const sync = useServerFn(syncTwilioNumbers);
  const dial = useServerFn(dialNumber);

  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [smsOnly, setSmsOnly] = useState(true);
  const [results, setResults] = useState<AvailableNumber[] | null>(null);
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [smsFrom, setSmsFrom] = useState<string | null>(null);
  const [callFrom, setCallFrom] = useState<string | null>(null);
  const [callTo, setCallTo] = useState("");
  const [callSourceLang, setCallSourceLang] = useState("en");
  const [callTargetLang, setCallTargetLang] = useState("es");

  const mine = useQuery({ queryKey: ["my-numbers"], queryFn: () => fetchMine({}) });

  const searchMutation = useMutation({
    mutationFn: () =>
      search({
        data: { country, areaCode: areaCode.trim() || undefined, smsEnabled: smsOnly },
      }),
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

  const smsMutation = useMutation({
    mutationFn: () =>
      smsFrom
        ? sms({ data: { fromId: smsFrom, to: smsTo.trim(), body: smsBody.trim() } })
        : Promise.reject(new Error("Choose one of your numbers first.")),
    onSuccess: () => {
      toast.success("Message sent");
      setSmsBody("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => sync({}),
    onSuccess: (data) => {
      toast.success(`Twilio synced: ${data.imported} imported, ${data.updated} updated.`);
      void queryClient.invalidateQueries({ queryKey: ["my-numbers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dialMutation = useMutation({
    mutationFn: () =>
      callFrom
        ? dial({
            data: {
              fromId: callFrom,
              to: callTo.trim(),
              sourceLang: callSourceLang,
              targetLang: callTargetLang,
            },
          })
        : Promise.reject(new Error("Choose one of your numbers to call from.")),
    onSuccess: () => {
      toast.success("Dialing — live audio will appear in Call Studio.");
      void navigate({ to: "/call-studio" });
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Import from Twilio
          </Button>
          <Button asChild variant="outline"><Link to="/history"><History className="h-4 w-4" /> History</Link></Button>
          <Button asChild variant="outline"><Link to="/voice-models"><Mic2 className="h-4 w-4" /> Voice models</Link></Button>
          <Button asChild variant="outline"><Link to="/call-studio"><PhoneCall className="h-4 w-4" /> Open Call Studio</Link></Button>
        </div>
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
                  {(n.capabilities as { voice?: boolean } | null)?.voice ? (
                    <Badge variant="outline">Voice</Badge>
                  ) : null}
                  {(n.capabilities as { sms?: boolean; SMS?: boolean } | null)?.sms ||
                  (n.capabilities as { SMS?: boolean } | null)?.SMS ? (
                    <Badge variant="outline">SMS</Badge>
                  ) : null}
                  <Badge variant="secondary">{n.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Send a text from ${n.phone_number}`}
                    onClick={() => setSmsFrom(n.id)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
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
          <div className="flex items-center gap-2 pb-2.5">
            <Switch id="sms-only" checked={smsOnly} onCheckedChange={setSmsOnly} />
            <Label htmlFor="sms-only" className="text-xs text-muted-foreground">
              SMS capable
            </Label>
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
                    {n.capabilities?.voice ? " · Voice" : ""}
                    {n.capabilities?.SMS ? " · SMS" : ""}
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

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Make a call</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dial anyone from one of your numbers. Live speech and its translation stream straight
          into Call Studio, where you can reply out loud.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!callFrom) {
              toast.error("Choose one of your numbers to call from.");
              return;
            }
            dialMutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="call-from" className="text-xs text-muted-foreground">
              Call from
            </Label>
            <select
              id="call-from"
              value={callFrom ?? ""}
              onChange={(e) => setCallFrom(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a number</option>
              {(mine.data ?? []).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.phone_number}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="call-to" className="text-xs text-muted-foreground">
              Call to
            </Label>
            <Input
              id="call-to"
              value={callTo}
              onChange={(e) => setCallTo(e.target.value)}
              placeholder="+15558675310"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="call-source" className="text-xs text-muted-foreground">
              They speak
            </Label>
            <select
              id="call-source"
              value={callSourceLang}
              onChange={(e) => setCallSourceLang(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CALL_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="call-target" className="text-xs text-muted-foreground">
              Translate to
            </Label>
            <select
              id="call-target"
              value={callTargetLang}
              onChange={(e) => setCallTargetLang(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CALL_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            className="w-fit"
            disabled={dialMutation.isPending || !callTo.trim()}
          >
            {dialMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            Dial now
          </Button>
        </form>
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Send a text</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick one of your numbers, then send an SMS straight from it.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!smsFrom) {
              toast.error("Choose one of your numbers first.");
              return;
            }
            smsMutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="sms-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <select
              id="sms-from"
              value={smsFrom ?? ""}
              onChange={(e) => setSmsFrom(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a number</option>
              {(mine.data ?? []).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.phone_number}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sms-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="sms-to"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
              placeholder="+15558675310"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sms-body" className="text-xs text-muted-foreground">
              Message
            </Label>
            <Textarea
              id="sms-body"
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              rows={3}
              placeholder="Hi from Karacter Hub"
            />
          </div>
          <Button
            type="submit"
            className="w-fit"
            disabled={smsMutation.isPending || !smsTo.trim() || !smsBody.trim()}
          >
            {smsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send message
          </Button>
        </form>
      </section>
    </div>
  );
}
