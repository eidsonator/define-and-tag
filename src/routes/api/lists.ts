import { createFileRoute } from "@tanstack/react-router";

import { createList, listLists } from "@/lib/words-api";

export const Route = createFileRoute("/api/lists")({
  server: {
    handlers: {
      GET: async ({ request }) => listLists(request),
      POST: async ({ request }) => createList(request),
    },
  },
});
