import { createFileRoute } from "@tanstack/react-router";

import { handleMcpDelete, handleMcpGet, handleMcpPost } from "@/lib/mcp-api";

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => handleMcpGet(request),
      POST: async ({ request }) => handleMcpPost(request),
      DELETE: async ({ request }) => handleMcpDelete(request),
    },
  },
});
