import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookMarked, Search, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lexicon — A dictionary that remembers your words" },
      {
        name: "description",
        content:
          "Look up Merriam-Webster definitions, then keep the words you love in your own tagged, annotated word lists.",
      },
      { property: "og:title", content: "Lexicon — A dictionary that remembers your words" },
      {
        property: "og:description",
        content:
          "Look up Merriam-Webster definitions, then keep the words you love in your own tagged, annotated word lists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">Lexicon</p>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          A dictionary that remembers the words you love
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Search Merriam-Webster definitions with forgiving, type-as-you-go suggestions. Keep the
          keepers in your own lists, tagged and annotated.
        </p>

        <div className="mt-10 flex gap-3">
          {signedIn ? (
            <Button size="lg" onClick={() => navigate({ to: "/search", search: { word: "" } })}>
              Open your dictionary
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Create an account</Link>
              </Button>
            </>
          )}
        </div>

        <div className="mt-20 grid w-full gap-4 text-left sm:grid-cols-3">
          <Feature icon={<Search className="size-5 text-primary" />} title="Forgiving search">
            Half-remembered spellings still find the word.
          </Feature>
          <Feature icon={<BookMarked className="size-5 text-primary" />} title="Many lists">
            Reading notes, study words, favourites — keep them apart.
          </Feature>
          <Feature icon={<Tag className="size-5 text-primary" />} title="Tags and notes">
            Add your own context so the word actually sticks.
          </Feature>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="paper-panel rounded-lg p-5">
      {icon}
      <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
