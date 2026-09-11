import { createFileRoute } from "@tanstack/react-router";

import { deleteList, getList, updateList } from "@/lib/words-api";

export const Route = createFileRoute("/api/lists/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => getList(request, params.id),
      PATCH: async ({ request, params }) => updateList(request, params.id),
      DELETE: async ({ request, params }) => deleteList(request, params.id),
    },
  },
});
