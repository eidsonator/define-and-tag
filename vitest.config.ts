import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/lib/fuzzy.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        "src/lib/fuzzy.ts": {
          100: true,
          perFile: true,
        },
      },
    },
  },
});
