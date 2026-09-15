import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Link
            to="/search"
            search={{ word: "" }}
            className="mr-auto font-display text-xl font-semibold tracking-tight"
          >
            Lexicon
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/search" search={{ word: "" }}>
              <Search className="size-4" /> Look up
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/lists">
              <BookMarked className="size-4" /> Lists
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
