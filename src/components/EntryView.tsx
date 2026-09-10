import type { DictEntry } from "@/lib/dictionary.functions";

export function EntryView({ entry }: { entry: DictEntry }) {
  return (
    <article className="paper-panel rounded-lg p-6">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-3xl font-semibold tracking-tight">{entry.headword}</h2>
        {entry.pronunciation && (
          <span className="font-sans text-sm text-muted-foreground">\{entry.pronunciation}\</span>
        )}
        {entry.functionalLabel && (
          <span className="font-display text-sm italic text-primary">{entry.functionalLabel}</span>
        )}
      </header>

      <ol className="mt-5 space-y-4">
        {(entry.senses.length ? entry.senses : entry.shortdefs.map((t) => ({ label: "", text: t, examples: [] }))).map(
          (sense, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 min-w-6 font-display text-sm text-muted-foreground">
                {sense.label || i + 1}
              </span>
              <div className="flex-1">
                <p className="leading-relaxed">{sense.text}</p>
                {sense.examples.map((ex, j) => (
                  <p key={j} className="mt-1 border-l-2 border-accent pl-3 text-sm italic text-muted-foreground">
                    {ex}
                  </p>
                ))}
              </div>
            </li>
          ),
        )}
      </ol>

      {(entry.etymology || entry.date) && (
        <footer className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          {entry.etymology && (
            <p>
              <span className="font-display italic">Origin</span> — {entry.etymology}
            </p>
          )}
          {entry.date && (
            <p className="mt-1">
              <span className="font-display italic">First known use</span> — {entry.date}
            </p>
          )}
        </footer>
      )}
    </article>
  );
}
