const QUOTES = [
  {
    quote: "Reduced call handling time by 40%.",
    name: "Ada N.",
    role: "Head of Support, Fintech",
  },
  {
    quote: "Our agents now cover nine languages without hiring a single new person.",
    name: "Marc L.",
    role: "COO, Logistics",
  },
  {
    quote: "Callers stopped asking us to repeat ourselves. The audio is just cleaner.",
    name: "Priya S.",
    role: "Contact Centre Lead",
  },
];

export function Testimonials() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold md:text-4xl">Teams already on the bridge</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure key={q.name} className="panel-surface rounded-2xl p-6">
              <blockquote className="text-lg font-medium">“{q.quote}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                {q.name} — {q.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
