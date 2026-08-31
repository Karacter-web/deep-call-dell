const STEPS = [
  { step: "01", title: "Customer calls your business", body: "Inbound calls stream straight into Deep Call Live over Twilio." },
  { step: "02", title: "AI transcribes and translates in real-time", body: "Speech-to-text, translation and tuning run on the live audio stream." },
  { step: "03", title: "Agent responds naturally—AI handles the rest", body: "Your agent speaks their own language; the caller hears theirs." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.step} className="panel-surface rounded-2xl p-6">
              <span className="font-mono text-sm text-accent">{s.step}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
