import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Clock3, Hash, Loader2, MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCommunicationHistory } from "@/lib/telephony.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Call & SMS History — Deep Call Live" },
      { name: "description", content: "Review calls, transcripts, translations, and text messages." },
      { property: "og:title", content: "Call & SMS History — Deep Call Live" },
      { property: "og:description", content: "Review calls, transcripts, translations, and text messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function HistoryPage() {
  const fetchHistory = useServerFn(getCommunicationHistory);
  const history = useQuery({ queryKey: ["communication-history"], queryFn: () => fetchHistory({}) });
  if (history.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const calls = history.data?.calls ?? [];
  const messages = history.data?.messages ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold md:text-3xl"><span className="text-gradient-signal">Communications history</span></h1><p className="mt-1 text-sm text-muted-foreground">Calls, transcripts, translations, and SMS activity in one place.</p></div>
        <Button asChild variant="outline"><Link to="/numbers"><Hash className="h-4 w-4" /> Phone numbers</Link></Button>
      </header>
      <Tabs defaultValue="calls">
        <TabsList><TabsTrigger value="calls"><Phone className="mr-2 h-4 w-4" />Calls</TabsTrigger><TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" />Messages</TabsTrigger></TabsList>
        <TabsContent value="calls" className="mt-4">
          {calls.length === 0 ? <Empty label="No calls have been recorded yet." /> : (
            <Accordion type="multiple" className="panel-surface px-5">
              {calls.map((call) => {
                const peer = call.direction === "inbound" ? call.from_number : call.to_number;
                const transcripts = [...(call.call_transcripts ?? [])].sort((a, b) => a.sequence - b.sequence);
                return <AccordionItem key={call.id} value={call.id}>
                  <AccordionTrigger className="gap-4 hover:no-underline"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"><span className="flex items-center gap-2 font-mono">{call.direction === "inbound" ? <ArrowDownLeft className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-primary" />}{peer ?? "Unknown number"}</span><Badge variant="secondary">{call.status}</Badge><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatDuration(call.duration_seconds)}</span><time className="ml-auto text-xs text-muted-foreground">{formatDate(call.started_at)}</time></div></AccordionTrigger>
                  <AccordionContent>{transcripts.length === 0 ? <p className="text-sm text-muted-foreground">No transcript was captured for this call.</p> : <ol className="grid gap-3">{transcripts.map((line) => <li key={line.id} className="rounded-md border border-border bg-card p-3"><div className="mb-1 flex items-center justify-between"><Badge variant="outline">{line.speaker}</Badge><span className="text-xs text-muted-foreground">{line.is_final ? "Final" : "Partial"}</span></div><p>{line.text}</p>{line.translated_text ? <p className="mt-2 border-l-2 border-primary pl-3 text-muted-foreground">{line.translated_text}</p> : null}</li>)}</ol>}</AccordionContent>
                </AccordionItem>;
              })}
            </Accordion>
          )}
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          {messages.length === 0 ? <Empty label="No text messages have been recorded yet." /> : <ul className="panel-surface divide-y divide-border px-5">{messages.map((message) => <li key={message.id} className="flex flex-wrap gap-4 py-4"><div className="mt-0.5">{message.direction === "inbound" ? <ArrowDownLeft className="h-5 w-5 text-primary" /> : <ArrowUpRight className="h-5 w-5 text-primary" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm">{message.direction === "inbound" ? message.from_number : message.to_number}</span><Badge variant="secondary">{message.status}</Badge></div><p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p>{message.error_message ? <p className="mt-1 text-xs text-destructive">{message.error_message}</p> : null}</div><time className="text-xs text-muted-foreground">{formatDate(message.sent_at ?? message.created_at)}</time></li>)}</ul>}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Empty({ label }: { label: string }) { return <div className="panel-surface py-16 text-center text-sm text-muted-foreground">{label}</div>; }