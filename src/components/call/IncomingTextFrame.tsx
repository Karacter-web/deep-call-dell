import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useCallStudio, LANGUAGES } from "@/context/CallStudioContext";

export function IncomingTextFrame() {
  const { incoming, sourceLang, callStatus } = useCallStudio();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [incoming]);

  const langLabel = LANGUAGES.find((l) => l.code === sourceLang)?.label ?? sourceLang;

  return (
    <section className="panel-surface flex min-h-0 flex-1 flex-col rounded-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Incoming transcript
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
            speech-to-text · {langLabel}
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          STT
        </Badge>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {incoming.length === 0 ? (
          <EmptyState
            title={callStatus === "active" ? "Listening…" : "No audio yet"}
            body="Raw transcription from the backend appears here as the caller speaks."
          />
        ) : (
          incoming.map((line) => (
            <article key={line.id} className="rounded-xl bg-secondary/60 px-4 py-3">
              <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>{line.speaker}</span>
                <span aria-hidden>·</span>
                <time dateTime={new Date(line.at).toISOString()}>
                  {new Date(line.at).toLocaleTimeString()}
                </time>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground">
                {line.text}
                {line.partial ? (
                  <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 rounded-sm bg-primary animate-pulse-live" />
                ) : null}
              </p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-14 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
