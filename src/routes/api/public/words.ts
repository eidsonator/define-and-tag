import { createFileRoute } from "@tanstack/react-router";

import { createWord, listWords } from "@/lib/words-api";

export const Route = createFileRoute("/api/public/words")({
  server: {
    handlers: {
      GET: async ({ request }) => listWords(request),
      POST: async ({ request }) => createWord(request),
    },
  },
});
