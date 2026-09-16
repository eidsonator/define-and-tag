import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createApiKey, deleteApiKey, getApiKeys, type ApiKey } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("MCP key");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mcpUrl = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;

  async function refresh() {
    try {
      setKeys(await getApiKeys());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load API keys.");
    }
  }

  useEffect(() => void refresh(), []);

  async function create() {
    setBusy(true);
    try {
      const result = await createApiKey({ data: { name } });
      setNewKey(result.key);
      setKeys((current) => [result.record, ...current]);
      toast.success("API key created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create API key.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteApiKey({ data: { id } });
      setKeys((current) => current.filter((key) => key.id !== id));
      toast.success("API key revoked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke API key.");
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage personal access for the REST API and MCP server.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" /> Create API key
          </CardTitle>
          <CardDescription>
            Keys are shown only once. Store the value in your MCP client before leaving this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Key name"
          />
          <Button onClick={create} disabled={busy}>
            {busy ? "Creating…" : "Create API key"}
          </Button>
          {newKey && (
            <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="mb-2 text-sm font-medium">
                Copy this now — it will not be shown again.
              </p>
              <code className="block break-all rounded bg-background p-2 text-sm">{newKey}</code>
              <p className="mt-3 text-sm text-muted-foreground">
                Use it as the <code>x-api-key</code> header for: <code>{mcpUrl}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {key.key_prefix}… · created {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void remove(key.id)}>
                  <Trash2 className="size-4" /> Revoke
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
