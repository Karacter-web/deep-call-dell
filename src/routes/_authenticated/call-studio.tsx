import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, Hash, History, Mic2 } from "lucide-react";
import { CallStudioProvider, useCallStudio } from "@/context/CallStudioContext";
import { AudioInput } from "@/components/call/AudioInput";
import { IncomingTextFrame } from "@/components/call/IncomingTextFrame";
import { TranslatedTextFrame } from "@/components/call/TranslatedTextFrame";
import { CallControls } from "@/components/call/CallControls";
import { SpeakToCaller } from "@/components/call/SpeakToCaller";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/call-studio")({
  head: () => ({
    meta: [
      { title: "Call Studio — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content:
          "Live call studio with real-time speech-to-text, translation and sound tuning for Twilio phone calls.",
      },
      { property: "og:title", content: "Call Studio — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content:
          "Monitor live calls with streaming transcription and translation side by side.",
      },
    ],
  }),
  component: CallStudioPage,
});

function CallStudioPage() {
  return (
    <CallStudioProvider>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
        <StudioHeader />
        <AudioInput />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <IncomingTextFrame />
          <TranslatedTextFrame />
        </div>
        <SpeakToCaller />
        <CallControls />
      </div>
    </CallStudioProvider>
  );
}

function StudioHeader() {
  const { isLiveCall, callerNumber } = useCallStudio();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          <span className="text-gradient-signal">Karacter Hub</span>
          <span className="text-muted-foreground"> | Deep Call Live</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time transcription, translation and sound tuning for inbound Twilio calls.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/history">
            <History className="h-4 w-4" /> History
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/numbers">
            <Hash className="h-4 w-4" /> Phone numbers
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/voice-models">
            <Mic2 className="h-4 w-4" /> Voice models
          </Link>
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs">
          <Radio
            className={
              isLiveCall ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 text-muted-foreground"
            }
            aria-hidden
          />
          {isLiveCall
            ? `live call${callerNumber ? ` · ${callerNumber}` : ""}`
            : "waiting for calls"}
        </div>
      </div>
    </header>
  );
}
