import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
