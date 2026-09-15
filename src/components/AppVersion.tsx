import { APP_VERSION } from "@/lib/app-version";

export function AppVersion() {
  return <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>;
}
