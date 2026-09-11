import { createFileRoute } from "@tanstack/react-router";

import { deleteWord, getWord, updateWord } from "@/lib/words-api";

export const Route = createFileRoute("/api/public/words/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => getWord(request, params.id),
      PATCH: async ({ request, params }) => updateWord(request, params.id),
      DELETE: async ({ request, params }) => deleteWord(request, params.id),
    },
  },
});
