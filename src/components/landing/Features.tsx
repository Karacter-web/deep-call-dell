import { AudioLines, Languages, SlidersHorizontal, MonitorSpeaker } from "lucide-react";

const FEATURES = [
  {
    icon: AudioLines,
    title: "Voice Transmission",
    body: "Crystal-clear audio with AI enhancement.",
  },
  {
    icon: Languages,
    title: "Language Bridge",
    body: "Break language barriers with real-time translation.",
  },
  {
    icon: SlidersHorizontal,
    title: "Sound Tuning",
    body: "Noise suppression and voice modulation for professional calls.",
  },
  {
    icon: MonitorSpeaker,
    title: "Call Studio",
    body: "Visualize conversations with live text transcription.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold md:text-4xl">Everything the call needs</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          One pipeline handles capture, cleanup, translation and playback so your agents just
          talk.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="panel-surface rounded-2xl p-6">
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
