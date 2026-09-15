import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername, usernameError } from "@/lib/username";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile | Lexicon" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast.error("Your profile could not be loaded.");
      } else {
        setUsername(data?.username ?? "");
      }
      setLoading(false);
    }

    void loadProfile();
  }, [user.id]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const errorMessage = usernameError(username);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: normalizeUsername(username) })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "That username is already taken." : "Profile update failed.",
      );
      return;
    }

    setUsername(normalizeUsername(username));
    queryClient.setQueryData(["profile", user.id], normalizeUsername(username));
    toast.success("Username updated.");
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted-foreground">Choose the name shown in Lexicon.</p>

      <form onSubmit={saveProfile} className="paper-panel mt-8 space-y-5 rounded-lg p-6">
        <div className="space-y-2">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            required
            autoComplete="username"
            disabled={loading || saving}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="word_keeper"
          />
          <p className="text-xs text-muted-foreground">
            3–32 lowercase letters, numbers, underscores, or hyphens.
          </p>
        </div>
        <Button type="submit" disabled={loading || saving}>
          {saving ? "Saving…" : "Save username"}
        </Button>
      </form>
    </section>
  );
}
