import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useCallStudio, LANGUAGES } from "@/context/CallStudioContext";
import { EmptyState } from "@/components/call/IncomingTextFrame";

export function TranslatedTextFrame() {
  const { translated, translationEnabled, targetLang } = useCallStudio();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [translated]);

  const langLabel = LANGUAGES.find((l) => l.code === targetLang)?.label ?? targetLang;

  return (
    <section className="panel-surface flex min-h-0 flex-1 flex-col rounded-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Translated output
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
            machine translation · {langLabel}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            translationEnabled
              ? "border-accent/40 text-accent"
              : "border-border text-muted-foreground"
          }
        >
          {translationEnabled ? "LIVE" : "OFF"}
        </Badge>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {!translationEnabled ? (
          <EmptyState
            title="Translation disabled"
            body="Turn translation on in the control panel to stream translated text alongside the transcript."
          />
        ) : translated.length === 0 ? (
          <EmptyState
            title="Waiting for translation"
            body="Each finalized transcript segment is translated and streamed here."
          />
        ) : (
          translated.map((line) => (
            <article
              key={line.id}
              className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3"
            >
              <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>{line.speaker}</span>
                <span aria-hidden>·</span>
                <time dateTime={new Date(line.at).toISOString()}>
                  {new Date(line.at).toLocaleTimeString()}
                </time>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground">{line.text}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
