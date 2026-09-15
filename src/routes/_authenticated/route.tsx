import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppVersion } from "@/components/AppVersion";

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
  const { user } = Route.useRouteContext();
  const { data: username = null } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      return data?.username ?? null;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
          <Button asChild variant="ghost" size="sm">
            <Link to="/profile">
              <UserRound className="size-4" />
              <span className="hidden sm:inline">{username ? `@${username}` : "Profile"}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-4xl px-4 py-4 text-center">
        <AppVersion />
      </footer>
    </div>
  );
}
